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
	ErrGenerationQuotaExceeded    = errors.New("resume generation quota exceeded")
	ErrGenerationIDConflict       = errors.New("generation id is already in use")
	ErrGenerationJobNotFound      = errors.New("job not found")
	ErrGenerationNotFound         = errors.New("generation not found")
	ErrGenerationRefunded         = errors.New("generation was already refunded")
	ErrGenerationCompleted        = errors.New("generation was already completed")
	ErrGenerationCategoryMismatch = errors.New("resume category does not match the job")
	ErrGenerationDraftNotFound    = errors.New("generated resume draft not found")
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
	CreditCharged   bool
	CreditBucket    *string
	ResumeCategory  models.ResumeCategory
	ProfileVersion  int
	TemplateVersion string
}

func ReserveResumeGeneration(
	ctx context.Context,
	userID string,
	generationID string,
	jobID string,
	model string,
	resumeCategory models.ResumeCategory,
	profileVersion int,
	templateVersion string,
) (models.ResumeGenerationAttempt, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	wallet, err := lockDocumentCreditWallet(ctx, tx, userID)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if err := refundStaleDocumentGenerations(ctx, tx, userID, &wallet, now); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	existing, err := getGenerationAttemptForUpdate(ctx, tx, generationID)
	if err == nil {
		if existing.UserID != userID || existing.JobID != jobID || existing.Model != model ||
			existing.ResumeCategory != resumeCategory || existing.ProfileVersion != profileVersion || existing.TemplateVersion != templateVersion {
			return models.ResumeGenerationAttempt{}, ErrGenerationIDConflict
		}
		usage, usageErr := documentCreditUsage(ctx, tx, userID, wallet)
		if usageErr != nil {
			return models.ResumeGenerationAttempt{}, usageErr
		}
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(existing, false, usage), nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.ResumeGenerationAttempt{}, err
	}

	var storedCategory *models.ResumeCategory
	var categoryStatus string
	if err := tx.QueryRow(
		ctx,
		`SELECT resume_category, resume_category_status
		 FROM jobs
		 WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	).Scan(&storedCategory, &categoryStatus); errors.Is(err, pgx.ErrNoRows) {
		return models.ResumeGenerationAttempt{}, ErrGenerationJobNotFound
	} else if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	if categoryStatus != "classified" || storedCategory == nil || *storedCategory != resumeCategory {
		return models.ResumeGenerationAttempt{}, ErrGenerationCategoryMismatch
	}

	creditBucket, err := debitDocumentCredit(ctx, tx, userID, &wallet, documentTypeResume, generationID, now)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO resume_generation_attempts (
		   id,
		   user_id,
		   seek_job_id,
		   status,
		   model,
		   resume_category,
		   profile_version,
		   template_version,
		   usage_period_start,
		   credit_bucket,
		   created_at,
		   updated_at
		 ) VALUES ($1, $2, $3, 'reserved', $4, $5, $6, $7, $8, $9, $10, $10)`,
		generationID,
		userID,
		jobID,
		model,
		resumeCategory,
		profileVersion,
		templateVersion,
		now,
		creditBucket,
		now,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.ResumeGenerationAttempt{}, ErrGenerationIDConflict
		}
		return models.ResumeGenerationAttempt{}, err
	}

	usage, err := documentCreditUsage(ctx, tx, userID, wallet)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.ResumeGenerationAttempt{}, err
	}

	return models.ResumeGenerationAttempt{
		GenerationID:    generationID,
		JobID:           jobID,
		Status:          "reserved",
		Created:         true,
		ResumeCategory:  resumeCategory,
		ProfileVersion:  profileVersion,
		TemplateVersion: templateVersion,
		Usage:           usage,
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
	wallet, err := lockDocumentCreditWallet(ctx, tx, userID)
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
		usage, usageErr := documentCreditUsage(ctx, tx, userID, wallet)
		if usageErr != nil {
			return models.ResumeGenerationAttempt{}, usageErr
		}
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(attempt, false, usage), nil
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO user_generated_resume_drafts (
		   user_id,
		   seek_job_id,
		   resume_json,
		   resume_category,
		   profile_version,
		   template_version,
		   created_at,
		   updated_at,
		   expires_at
		 ) VALUES (
		   $1,
		   $2,
		   $3::jsonb,
		   $4,
		   $5,
		   $6,
		   $7::timestamptz,
		   $7::timestamptz,
		   $7::timestamptz + interval '30 days'
		 )
		 ON CONFLICT (user_id, seek_job_id)
		 DO UPDATE SET
		   resume_json = EXCLUDED.resume_json,
		   resume_category = EXCLUDED.resume_category,
		   profile_version = EXCLUDED.profile_version,
		   template_version = EXCLUDED.template_version,
		   updated_at = EXCLUDED.updated_at,
		   expires_at = EXCLUDED.expires_at`,
		userID,
		attempt.JobID,
		string(resumeJSON),
		attempt.ResumeCategory,
		attempt.ProfileVersion,
		attempt.TemplateVersion,
		now,
	)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
	}
	usage, err := documentCreditUsage(ctx, tx, userID, wallet)
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
		ResumeCategory:  attempt.ResumeCategory,
		ProfileVersion:  attempt.ProfileVersion,
		TemplateVersion: attempt.TemplateVersion,
		Usage:           usage,
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
	wallet, err := lockDocumentCreditWallet(ctx, tx, userID)
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
		usage, usageErr := documentCreditUsage(ctx, tx, userID, wallet)
		if usageErr != nil {
			return models.ResumeGenerationAttempt{}, usageErr
		}
		if err := tx.Commit(ctx); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
		return attemptResponse(attempt, false, usage), nil
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

	if attempt.CreditCharged {
		if attempt.CreditBucket == nil {
			return models.ResumeGenerationAttempt{}, errors.New("charged resume generation is missing its credit bucket")
		}
		if err := restoreDocumentCredit(
			ctx,
			tx,
			userID,
			&wallet,
			*attempt.CreditBucket,
			documentTypeResume,
			generationID,
			now,
		); err != nil {
			return models.ResumeGenerationAttempt{}, err
		}
	}
	usage, err := documentCreditUsage(ctx, tx, userID, wallet)
	if err != nil {
		return models.ResumeGenerationAttempt{}, err
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
		ResumeCategory:  attempt.ResumeCategory,
		ProfileVersion:  attempt.ProfileVersion,
		TemplateVersion: attempt.TemplateVersion,
		Usage:           usage,
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
		        resume_category,
		        profile_version,
		        template_version,
		        status,
		        result_json::text,
		        failure_code,
		        attempt_count,
		        repair_attempted,
		        credit_charged,
		        credit_bucket
		 FROM resume_generation_attempts
		 WHERE id = $1
		 FOR UPDATE`,
		generationID,
	).Scan(
		&attempt.GenerationID,
		&attempt.UserID,
		&attempt.JobID,
		&attempt.Model,
		&attempt.ResumeCategory,
		&attempt.ProfileVersion,
		&attempt.TemplateVersion,
		&attempt.Status,
		&attempt.ResultJSON,
		&attempt.FailureCode,
		&attempt.AttemptCount,
		&attempt.RepairAttempted,
		&attempt.CreditCharged,
		&attempt.CreditBucket,
	)
	return attempt, err
}

func attemptResponse(attempt generationAttemptRow, created bool, usage models.DocumentCreditUsage) models.ResumeGenerationAttempt {
	response := models.ResumeGenerationAttempt{
		GenerationID:    attempt.GenerationID,
		JobID:           attempt.JobID,
		Status:          attempt.Status,
		Created:         created,
		FailureCode:     attempt.FailureCode,
		AttemptCount:    attempt.AttemptCount,
		RepairAttempted: attempt.RepairAttempted,
		ResumeCategory:  attempt.ResumeCategory,
		ProfileVersion:  attempt.ProfileVersion,
		TemplateVersion: attempt.TemplateVersion,
		Usage:           usage,
	}
	if attempt.ResultJSON != nil {
		response.Resume = json.RawMessage(*attempt.ResultJSON)
	}
	return response
}
