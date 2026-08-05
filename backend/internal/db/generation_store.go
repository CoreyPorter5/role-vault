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
	ErrGenerationQuotaExceeded = errors.New("resume generation quota exceeded")
	ErrGenerationIDConflict    = errors.New("generation id is already in use")
	ErrGenerationJobNotFound   = errors.New("job not found")
	ErrGenerationNotFound      = errors.New("generation not found")
	ErrGenerationRefunded      = errors.New("generation was already refunded")
	ErrGenerationCompleted     = errors.New("generation was already completed")
)

type generationAttemptRow struct {
	GenerationID    string
	UserID          string
	JobID           string
	Model           string
	Status          string
	ResultJSON      *string
	FailureCode     *string
	AttemptCount    int
	RepairAttempted bool
	PeriodStart     time.Time
	CreditCharged   bool
}

func ReserveResumeGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	jobID string,
	model string,
) (models.ResumeGenerationAttempt, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if err := refundStaleGenerationAttempts(ctx, tx, userID, &profile, now); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	existing, err := getGenerationAttemptForUpdate(ctx, tx, generationID)
	if err == nil {
		if existing.UserID != userID || existing.JobID != jobID || existing.Model != model {
			return models.ResumeGenerationAttempt{}, ErrGenerationIDConflict
		}
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(existing, false, profile), nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.ResumeGenerationAttempt{}, err
	}

	var jobExists bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (
		   SELECT 1
		   FROM jobs
		   WHERE user_id = $1 AND seek_job_id = $2
		 )`,
		userID,
		jobID,
	).Scan(&jobExists); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if !jobExists {
		return models.ResumeGenerationAttempt{}, ErrGenerationJobNotFound
	}

	if profile.Used >= profile.Limit {
		return models.ResumeGenerationAttempt{}, ErrGenerationQuotaExceeded
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO resume_generation_attempts (
		   id,
		   user_id,
		   seek_job_id,
		   status,
		   model,
		   usage_period_start,
		   created_at,
		   updated_at
		 ) VALUES ($1, $2, $3, 'reserved', $4, $5, $6, $6)`,
		generationID,
		userID,
		jobID,
		model,
		profile.PeriodStart,
		now,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.ResumeGenerationAttempt{}, ErrGenerationIDConflict
		}
		return models.ResumeGenerationAttempt{}, err
	}

	profile.Used++
	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET resume_generations_used = $2,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		profile.Used,
	)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	return models.ResumeGenerationAttempt{
		GenerationID: generationID,
		JobID:        jobID,
		Status:       "reserved",
		Created:      true,
		Usage:        usageFromProfile(profile),
	}, nil
}

func CompleteResumeGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	resume models.TailoredResume,
	tokenUsage json.RawMessage,
	attemptCount int,
	repairAttempted bool,
) (models.ResumeGenerationAttempt, error) {
	resumeJSON, err := json.Marshal(resume)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	attempt, err := getGenerationAttemptForUpdate(ctx, tx, generationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ResumeGenerationAttempt{}, ErrGenerationNotFound
	}
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if attempt.UserID != userID {
		return models.ResumeGenerationAttempt{}, ErrGenerationNotFound
	}
	if attempt.Status == "refunded" {
		return models.ResumeGenerationAttempt{}, ErrGenerationRefunded
	}
	if attempt.Status == "succeeded" {
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(attempt, false, profile), nil
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO user_generated_resume_drafts (
		   user_id,
		   seek_job_id,
		   resume_json,
		   created_at,
		   updated_at,
		   expires_at
		 ) VALUES (
		   $1,
		   $2,
		   $3::jsonb,
		   $4::timestamptz,
		   $4::timestamptz,
		   $4::timestamptz + interval '30 days'
		 )
		 ON CONFLICT (user_id, seek_job_id)
		 DO UPDATE SET
		   resume_json = EXCLUDED.resume_json,
		   updated_at = EXCLUDED.updated_at,
		   expires_at = EXCLUDED.expires_at`,
		userID,
		attempt.JobID,
		string(resumeJSON),
		now,
	)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE resume_generation_attempts
		 SET status = 'succeeded',
		     result_json = $2::jsonb,
		     token_usage = $3::jsonb,
		     attempt_count = $4,
		     repair_attempted = $5,
		     completed_at = $6,
		     updated_at = $6
		 WHERE id = $1`,
		generationID,
		string(resumeJSON),
		string(tokenUsage),
		attemptCount,
		repairAttempted,
		now,
	)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	return models.ResumeGenerationAttempt{
		GenerationID:    generationID,
		JobID:           attempt.JobID,
		Status:          "succeeded",
		Created:         false,
		Resume:          json.RawMessage(resumeJSON),
		AttemptCount:    attemptCount,
		RepairAttempted: repairAttempted,
		Usage:           usageFromProfile(profile),
	}, nil
}

func RefundResumeGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	failureCode string,
	failureDetail string,
	tokenUsage json.RawMessage,
	attemptCount int,
	repairAttempted bool,
) (models.ResumeGenerationAttempt, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	attempt, err := getGenerationAttemptForUpdate(ctx, tx, generationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ResumeGenerationAttempt{}, ErrGenerationNotFound
	}
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if attempt.UserID != userID {
		return models.ResumeGenerationAttempt{}, ErrGenerationNotFound
	}
	if attempt.Status == "succeeded" {
		return models.ResumeGenerationAttempt{}, ErrGenerationCompleted
	}
	if attempt.Status == "refunded" {
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(attempt, false, profile), nil
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE resume_generation_attempts
		 SET status = 'refunded',
		     failure_code = $2,
		     failure_detail = $3,
		     token_usage = $4::jsonb,
		     attempt_count = $5,
		     repair_attempted = $6,
		     credit_charged = false,
		     refunded_at = $7,
		     updated_at = $7
		 WHERE id = $1`,
		generationID,
		failureCode,
		failureDetail,
		string(tokenUsage),
		attemptCount,
		repairAttempted,
		now,
	)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	if attempt.CreditCharged && attempt.PeriodStart.Equal(profile.PeriodStart) && profile.Used > 0 {
		profile.Used--
		_, err = tx.Exec(
			ctx,
			`UPDATE profiles
			 SET resume_generations_used = $2,
			     updated_at = now()
			 WHERE user_id = $1`,
			userID,
			profile.Used,
		)
		if err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	return models.ResumeGenerationAttempt{
		GenerationID:    generationID,
		JobID:           attempt.JobID,
		Status:          "refunded",
		Created:         false,
		FailureCode:     &failureCode,
		AttemptCount:    attemptCount,
		RepairAttempted: repairAttempted,
		Usage:           usageFromProfile(profile),
	}, nil
}

func getGenerationAttemptForUpdate(ctx context.Context, tx pgx.Tx, generationID string) (generationAttemptRow, error) {
	var attempt generationAttemptRow
	err := tx.QueryRow(
		ctx,
		`SELECT id,
		        user_id,
		        seek_job_id,
		        model,
		        status,
		        result_json::text,
		        failure_code,
		        attempt_count,
		        repair_attempted,
		        usage_period_start,
		        credit_charged
		 FROM resume_generation_attempts
		 WHERE id = $1
		 FOR UPDATE`,
		generationID,
	).Scan(
		&attempt.GenerationID,
		&attempt.UserID,
		&attempt.JobID,
		&attempt.Model,
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

func attemptResponse(attempt generationAttemptRow, created bool, profile quotaProfile) models.ResumeGenerationAttempt {
	response := models.ResumeGenerationAttempt{
		GenerationID:    attempt.GenerationID,
		JobID:           attempt.JobID,
		Status:          attempt.Status,
		Created:         created,
		FailureCode:     attempt.FailureCode,
		AttemptCount:    attempt.AttemptCount,
		RepairAttempted: attempt.RepairAttempted,
		Usage:           usageFromProfile(profile),
	}
	if attempt.ResultJSON != nil {
		response.Resume = json.RawMessage(*attempt.ResultJSON)
	}
	return response
}
