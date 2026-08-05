package db

import (
	"context"
	"errors"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

const (
	freeResumeGenerationLimit = 3
	proResumeGenerationLimit  = 100
	freeUsagePeriod           = 30 * 24 * time.Hour
	staleGenerationAge        = 15 * time.Minute
)

var ErrProfileNotFound = errors.New("profile not found")

type quotaProfile struct {
	Plan        string
	Used        int
	Limit       int
	PeriodStart time.Time
	PeriodEnd   time.Time
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

	if err := refundStaleGenerationAttempts(ctx, tx, userID, &profile, time.Now().UTC()); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationUsage{}, err
	}

	return usageFromProfile(profile), nil
}

func lockAndNormalizeQuotaProfile(ctx context.Context, tx pgx.Tx, userID string, now time.Time) (quotaProfile, error) {
	var profile quotaProfile
	err := tx.QueryRow(
		ctx,
		`SELECT plan, resume_generations_used, resume_generations_limit, resume_usage_period_start, resume_usage_period_end
		 FROM profiles
		 WHERE user_id = $1
		 FOR UPDATE`,
		userID,
	).Scan(
		&profile.Plan,
		&profile.Used,
		&profile.Limit,
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
	profile.Used = 0
	profile.Limit = freeResumeGenerationLimit

	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET resume_generations_used = 0,
		     resume_generations_limit = $2,
		     resume_usage_period_start = $3,
		     resume_usage_period_end = $4,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.Limit,
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

func refundStaleGenerationAttempts(ctx context.Context, tx pgx.Tx, userID string, profile *quotaProfile, now time.Time) error {
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

	if creditsToRestore == 0 || profile.Used == 0 {
		return nil
	}
	if creditsToRestore > profile.Used {
		creditsToRestore = profile.Used
	}

	profile.Used -= creditsToRestore
	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET resume_generations_used = $2,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.Used,
	)
	return err
}

func usageFromProfile(profile quotaProfile) models.ResumeGenerationUsage {
	remaining := profile.Limit - profile.Used
	if remaining < 0 {
		remaining = 0
	}

	return models.ResumeGenerationUsage{
		Used:        profile.Used,
		Limit:       profile.Limit,
		Remaining:   remaining,
		CanGenerate: remaining > 0,
		PeriodStart: profile.PeriodStart.UTC().Format(time.RFC3339Nano),
		PeriodEnd:   profile.PeriodEnd.UTC().Format(time.RFC3339Nano),
	}
}
