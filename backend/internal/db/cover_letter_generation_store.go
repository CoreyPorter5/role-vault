package db

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrCoverLetterGenerationQuotaExceeded = errors.New("cover letter generation quota exceeded")
	ErrCoverLetterGenerationIDConflict    = errors.New("cover letter generation id is already in use")
	ErrCoverLetterGenerationNotFound      = errors.New("cover letter generation not found")
	ErrCoverLetterGenerationRefunded      = errors.New("cover letter generation was already refunded")
	ErrCoverLetterGenerationCompleted     = errors.New("cover letter generation was already completed")
	ErrCoverLetterDraftNotFound           = errors.New("generated cover letter draft not found")
)

type coverLetterGenerationAttemptRow struct {
	GenerationID    string
	UserID          string
	JobID           string
	Model           string
	TemplateVersion string
	Status          string
	ResultJSON      *string
	FailureCode     *string
	AttemptCount    int
	RepairAttempted bool
	PeriodStart     time.Time
	CreditCharged   bool
}

func ReserveCoverLetterGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	jobID string,
	model string,
	templateVersion string,
) (models.CoverLetterGenerationAttempt, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	if err := refundStaleCoverLetterGenerationAttempts(ctx, tx, userID, &profile, now); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	existing, err := getCoverLetterGenerationAttemptForUpdate(ctx, tx, generationID)
	if err == nil {
		if existing.UserID != userID || existing.JobID != jobID || existing.Model != model || existing.TemplateVersion != templateVersion {
			return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationIDConflict
		}
		if err := tx.Commit(ctx); err != nil {
			return models.CoverLetterGenerationAttempt{}, err
		}
		return coverLetterAttemptResponse(existing, false, profile), nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.CoverLetterGenerationAttempt{}, err
	}

	var ownsJob bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM jobs WHERE user_id = $1 AND seek_job_id = $2)`,
		userID,
		jobID,
	).Scan(&ownsJob); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	if !ownsJob {
		return models.CoverLetterGenerationAttempt{}, ErrGenerationJobNotFound
	}
	if profile.CoverLetterUsed >= profile.CoverLetterLimit {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationQuotaExceeded
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO cover_letter_generation_attempts (
		   id, user_id, seek_job_id, status, model, template_version,
		   usage_period_start, created_at, updated_at
		 ) VALUES ($1, $2, $3, 'reserved', $4, $5, $6, $7, $7)`,
		generationID,
		userID,
		jobID,
		model,
		templateVersion,
		profile.PeriodStart,
		now,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationIDConflict
		}
		return models.CoverLetterGenerationAttempt{}, err
	}

	profile.CoverLetterUsed++
	if _, err := tx.Exec(
		ctx,
		`UPDATE profiles
		 SET cover_letter_generations_used = $2, updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.CoverLetterUsed,
	); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	return models.CoverLetterGenerationAttempt{
		GenerationID:    generationID,
		JobID:           jobID,
		Status:          "reserved",
		Created:         true,
		TemplateVersion: templateVersion,
		Usage:           coverLetterUsageFromProfile(profile),
	}, nil
}

func CompleteCoverLetterGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	coverLetter models.CoverLetter,
	tokenUsage json.RawMessage,
	attemptCount int,
	repairAttempted bool,
) (models.CoverLetterGenerationAttempt, error) {
	coverLetterJSON, err := json.Marshal(coverLetter)
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	attempt, err := getCoverLetterGenerationAttemptForUpdate(ctx, tx, generationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationNotFound
	}
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	if attempt.UserID != userID {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationNotFound
	}
	if attempt.Status == "refunded" {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationRefunded
	}
	if attempt.Status == "succeeded" {
		if err := tx.Commit(ctx); err != nil {
			return models.CoverLetterGenerationAttempt{}, err
		}
		return coverLetterAttemptResponse(attempt, false, profile), nil
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO user_generated_cover_letter_drafts (
		   user_id, seek_job_id, cover_letter_json, template_version,
		   created_at, updated_at, expires_at
		 ) VALUES ($1, $2, $3::jsonb, $4, $5, $5, $5 + interval '30 days')
		 ON CONFLICT (user_id, seek_job_id)
		 DO UPDATE SET
		   cover_letter_json = EXCLUDED.cover_letter_json,
		   template_version = EXCLUDED.template_version,
		   updated_at = EXCLUDED.updated_at,
		   expires_at = EXCLUDED.expires_at`,
		userID,
		attempt.JobID,
		string(coverLetterJSON),
		attempt.TemplateVersion,
		now,
	); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	if _, err := tx.Exec(
		ctx,
		`UPDATE cover_letter_generation_attempts
		 SET status = 'succeeded', result_json = $2::jsonb, token_usage = $3::jsonb,
		     attempt_count = $4, repair_attempted = $5, completed_at = $6, updated_at = $6
		 WHERE id = $1`,
		generationID,
		string(coverLetterJSON),
		string(tokenUsage),
		attemptCount,
		repairAttempted,
		now,
	); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	return models.CoverLetterGenerationAttempt{
		GenerationID:    generationID,
		JobID:           attempt.JobID,
		Status:          "succeeded",
		CoverLetter:     json.RawMessage(coverLetterJSON),
		AttemptCount:    attemptCount,
		RepairAttempted: repairAttempted,
		TemplateVersion: attempt.TemplateVersion,
		Usage:           coverLetterUsageFromProfile(profile),
	}, nil
}

func RefundCoverLetterGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	failureCode string,
	failureDetail string,
	tokenUsage json.RawMessage,
	attemptCount int,
	repairAttempted bool,
) (models.CoverLetterGenerationAttempt, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	attempt, err := getCoverLetterGenerationAttemptForUpdate(ctx, tx, generationID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && attempt.UserID != userID) {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationNotFound
	}
	if err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}
	if attempt.Status == "succeeded" {
		return models.CoverLetterGenerationAttempt{}, ErrCoverLetterGenerationCompleted
	}
	if attempt.Status == "refunded" {
		if err := tx.Commit(ctx); err != nil {
			return models.CoverLetterGenerationAttempt{}, err
		}
		return coverLetterAttemptResponse(attempt, false, profile), nil
	}

	if _, err := tx.Exec(
		ctx,
		`UPDATE cover_letter_generation_attempts
		 SET status = 'refunded', failure_code = $2, failure_detail = $3,
		     token_usage = $4::jsonb, attempt_count = $5, repair_attempted = $6,
		     credit_charged = false, refunded_at = $7, updated_at = $7
		 WHERE id = $1`,
		generationID,
		failureCode,
		failureDetail,
		string(tokenUsage),
		attemptCount,
		repairAttempted,
		now,
	); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	if attempt.CreditCharged && attempt.PeriodStart.Equal(profile.PeriodStart) && profile.CoverLetterUsed > 0 {
		profile.CoverLetterUsed--
		if _, err := tx.Exec(
			ctx,
			`UPDATE profiles SET cover_letter_generations_used = $2, updated_at = now() WHERE user_id = $1`,
			userID,
			profile.CoverLetterUsed,
		); err != nil {
			return models.CoverLetterGenerationAttempt{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return models.CoverLetterGenerationAttempt{}, err
	}

	attempt.Status = "refunded"
	attempt.FailureCode = &failureCode
	attempt.AttemptCount = attemptCount
	attempt.RepairAttempted = repairAttempted
	attempt.CreditCharged = false
	return coverLetterAttemptResponse(attempt, false, profile), nil
}

func getCoverLetterGenerationAttemptForUpdate(ctx context.Context, tx pgx.Tx, generationID string) (coverLetterGenerationAttemptRow, error) {
	var attempt coverLetterGenerationAttemptRow
	err := tx.QueryRow(
		ctx,
		`SELECT id, user_id, seek_job_id, model, template_version, status,
		        result_json::text, failure_code, attempt_count, repair_attempted,
		        usage_period_start, credit_charged
		 FROM cover_letter_generation_attempts
		 WHERE id = $1
		 FOR UPDATE`,
		generationID,
	).Scan(
		&attempt.GenerationID,
		&attempt.UserID,
		&attempt.JobID,
		&attempt.Model,
		&attempt.TemplateVersion,
		&attempt.Status,
		&attempt.ResultJSON,
		&attempt.FailureCode,
		&attempt.AttemptCount,
		&attempt.RepairAttempted,
		&attempt.PeriodStart,
		&attempt.CreditCharged,
	)
	return attempt, err
}

func coverLetterAttemptResponse(attempt coverLetterGenerationAttemptRow, created bool, profile quotaProfile) models.CoverLetterGenerationAttempt {
	response := models.CoverLetterGenerationAttempt{
		GenerationID:    attempt.GenerationID,
		JobID:           attempt.JobID,
		Status:          attempt.Status,
		Created:         created,
		FailureCode:     attempt.FailureCode,
		AttemptCount:    attempt.AttemptCount,
		RepairAttempted: attempt.RepairAttempted,
		TemplateVersion: attempt.TemplateVersion,
		Usage:           coverLetterUsageFromProfile(profile),
	}
	if attempt.ResultJSON != nil {
		response.CoverLetter = json.RawMessage(*attempt.ResultJSON)
	}
	return response
}
