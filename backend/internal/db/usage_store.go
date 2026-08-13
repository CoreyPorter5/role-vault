package db

import (
	"context"
	"errors"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

const (
	freeResumeGenerationLimit      = 3
	proResumeGenerationLimit       = 100
	freeCoverLetterGenerationLimit = 3
	proCoverLetterGenerationLimit  = 100
	freeUsagePeriod                = 30 * 24 * time.Hour
	staleGenerationAge             = 15 * time.Minute
)

var ErrProfileNotFound = errors.New("profile not found")

type quotaProfile struct {
	Plan             string
	ResumeUsed       int
	ResumeLimit      int
	CoverLetterUsed  int
	CoverLetterLimit int
	PeriodStart      time.Time
	PeriodEnd        time.Time
}

func GetResumeGenerationUsage(ctx context.Context, userID string) (models.ResumeGenerationUsage, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationUsage{}, err
	}
	defer tx.Rollback(ctx)

	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, time.Now().UTC())
	if err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	if err := refundStaleResumeGenerationAttempts(ctx, tx, userID, &profile, time.Now().UTC()); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	return resumeUsageFromProfile(profile), nil
}

func GetCoverLetterGenerationUsage(ctx context.Context, userID string) (models.ResumeGenerationUsage, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationUsage{}, err
	}
	defer tx.Rollback(ctx)

	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, time.Now().UTC())
	if err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	if err := refundStaleCoverLetterGenerationAttempts(ctx, tx, userID, &profile, time.Now().UTC()); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	return coverLetterUsageFromProfile(profile), nil
}

func lockAndNormalizeQuotaProfile(ctx context.Context, tx pgx.Tx, userID string, now time.Time) (quotaProfile, error) {
	var profile quotaProfile
	err := tx.QueryRow(
		ctx,
		`SELECT plan, resume_generations_used, resume_generations_limit,
		        cover_letter_generations_used, cover_letter_generations_limit,
		        resume_usage_period_start, resume_usage_period_end
		 FROM profiles
		 WHERE user_id = $1
		 FOR UPDATE`,
		userID,
	).Scan(
		&profile.Plan,
		&profile.ResumeUsed,
		&profile.ResumeLimit,
		&profile.CoverLetterUsed,
		&profile.CoverLetterLimit,
		&profile.PeriodStart,
		&profile.PeriodEnd,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return quotaProfile{}, ErrProfileNotFound
	}
	if err != nil {
		return quotaProfile{}, err
	}

	if profile.Plan != "free" || now.Before(profile.PeriodEnd) {
		return profile, nil
	}

	profile.PeriodStart, profile.PeriodEnd = advanceFreeUsagePeriod(profile.PeriodEnd, now)
	profile.ResumeUsed = 0
	profile.ResumeLimit = freeResumeGenerationLimit
	profile.CoverLetterUsed = 0
	profile.CoverLetterLimit = freeCoverLetterGenerationLimit

	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET resume_generations_used = 0,
		     resume_generations_limit = $2,
		     cover_letter_generations_used = 0,
		     cover_letter_generations_limit = $3,
		     resume_usage_period_start = $4,
		     resume_usage_period_end = $5,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.ResumeLimit,
		profile.CoverLetterLimit,
		profile.PeriodStart,
		profile.PeriodEnd,
	)
	if err != nil {
		return quotaProfile{}, err
	}

	return profile, nil
}

func advanceFreeUsagePeriod(expiredPeriodEnd time.Time, now time.Time) (time.Time, time.Time) {
	if expiredPeriodEnd.IsZero() || now.Before(expiredPeriodEnd) {
		start := now
		return start, start.Add(freeUsagePeriod)
	}

	periodsSinceEnd := int64(now.Sub(expiredPeriodEnd) / freeUsagePeriod)
	start := expiredPeriodEnd.Add(time.Duration(periodsSinceEnd) * freeUsagePeriod)
	return start, start.Add(freeUsagePeriod)
}

func refundStaleResumeGenerationAttempts(ctx context.Context, tx pgx.Tx, userID string, profile *quotaProfile, now time.Time) error {
	rows, err := tx.Query(
		ctx,
		`UPDATE resume_generation_attempts
		 SET status = 'refunded',
		     failure_code = 'stale_generation',
		     failure_detail = 'Generation did not finish before the stale-attempt deadline.',
		     credit_charged = false,
		     refunded_at = $3,
		     updated_at = $3
		 WHERE user_id = $1
		   AND status = 'reserved'
		   AND created_at < $2
		 RETURNING usage_period_start`,
		userID,
		now.Add(-staleGenerationAge),
		now,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	creditsToRestore := 0
	for rows.Next() {
		var attemptPeriodStart time.Time
		if err := rows.Scan(&attemptPeriodStart); err != nil {
			return err
		}
		if attemptPeriodStart.Equal(profile.PeriodStart) {
			creditsToRestore++
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if creditsToRestore == 0 || profile.ResumeUsed == 0 {
		return nil
	}
	if creditsToRestore > profile.ResumeUsed {
		creditsToRestore = profile.ResumeUsed
	}

	profile.ResumeUsed -= creditsToRestore
	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET resume_generations_used = $2,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.ResumeUsed,
	)
	return err
}

func refundStaleCoverLetterGenerationAttempts(ctx context.Context, tx pgx.Tx, userID string, profile *quotaProfile, now time.Time) error {
	rows, err := tx.Query(
		ctx,
		`UPDATE cover_letter_generation_attempts
		 SET status = 'refunded',
		     failure_code = 'stale_generation',
		     failure_detail = 'Generation did not finish before the stale-attempt deadline.',
		     credit_charged = false,
		     refunded_at = $3,
		     updated_at = $3
		 WHERE user_id = $1
		   AND status = 'reserved'
		   AND created_at < $2
		 RETURNING usage_period_start`,
		userID,
		now.Add(-staleGenerationAge),
		now,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	creditsToRestore := 0
	for rows.Next() {
		var attemptPeriodStart time.Time
		if err := rows.Scan(&attemptPeriodStart); err != nil {
			return err
		}
		if attemptPeriodStart.Equal(profile.PeriodStart) {
			creditsToRestore++
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if creditsToRestore == 0 || profile.CoverLetterUsed == 0 {
		return nil
	}
	if creditsToRestore > profile.CoverLetterUsed {
		creditsToRestore = profile.CoverLetterUsed
	}

	profile.CoverLetterUsed -= creditsToRestore
	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET cover_letter_generations_used = $2,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.CoverLetterUsed,
	)
	return err
}

func resumeUsageFromProfile(profile quotaProfile) models.ResumeGenerationUsage {
	return usageFromValues(profile.ResumeUsed, profile.ResumeLimit, profile.PeriodStart, profile.PeriodEnd)
}

func coverLetterUsageFromProfile(profile quotaProfile) models.ResumeGenerationUsage {
	return usageFromValues(profile.CoverLetterUsed, profile.CoverLetterLimit, profile.PeriodStart, profile.PeriodEnd)
}

func usageFromValues(used, limit int, periodStart, periodEnd time.Time) models.ResumeGenerationUsage {
	remaining := limit - used
	if remaining < 0 {
		remaining = 0
	}

	return models.ResumeGenerationUsage{
		Used:        used,
		Limit:       limit,
		Remaining:   remaining,
		CanGenerate: remaining > 0,
		PeriodStart: periodStart.UTC().Format(time.RFC3339Nano),
		PeriodEnd:   periodEnd.UTC().Format(time.RFC3339Nano),
	}
}
