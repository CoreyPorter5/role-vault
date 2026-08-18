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

func GetResumeGenerationUsage(ctx context.Context, userID string) (models.DocumentCreditUsage, error) {
	return GetDocumentCreditUsage(ctx, userID)
}

func GetCoverLetterGenerationUsage(ctx context.Context, userID string) (models.DocumentCreditUsage, error) {
	return GetDocumentCreditUsage(ctx, userID)
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
