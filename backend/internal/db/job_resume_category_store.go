package db

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type categoryRowScanner interface {
	Scan(dest ...any) error
}

const jobResumeCategoryClaimTimeout = 2 * time.Minute

const jobClassificationUsagePeriod = 24 * time.Hour

var ErrJobClassificationQuotaExceeded = errors.New("job classification daily quota exceeded")

type jobClassificationQuota struct {
	Used        int
	Limit       int
	PeriodStart time.Time
	PeriodEnd   time.Time
}

func GetJobResumeCategory(ctx context.Context, userID, jobID string) (models.JobResumeCategory, error) {
	state, err := scanJobResumeCategory(Conn.QueryRow(
		ctx,
		`SELECT seek_job_id,
		        resume_category_status,
		        resume_category,
		        resume_category_source,
		        resume_category_confidence,
		        resume_category_classifier_model,
		        resume_category_classifier_version,
		        resume_category_failure_code,
		        resume_category_started_at,
		        resume_category_resolved_at,
		        job_title,
		        job_description
		 FROM jobs
		 WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.JobResumeCategory{}, ErrGenerationJobNotFound
	}
	return state, err
}

func SetJobResumeCategory(
	ctx context.Context,
	userID string,
	jobID string,
	category models.ResumeCategory,
) (models.JobResumeCategory, error) {
	state, err := scanJobResumeCategory(Conn.QueryRow(
		ctx,
		`UPDATE jobs
		 SET resume_category = $3,
		     resume_category_source = 'user',
		     resume_category_confidence = NULL,
		     resume_category_status = 'classified',
		     resume_category_classifier_model = NULL,
		     resume_category_classifier_version = NULL,
		     resume_category_failure_code = NULL,
		     resume_category_started_at = NULL,
		     resume_category_resolved_at = now()
		 WHERE user_id = $1 AND seek_job_id = $2
		 RETURNING seek_job_id,
		           resume_category_status,
		           resume_category,
		           resume_category_source,
		           resume_category_confidence,
		           resume_category_classifier_model,
		           resume_category_classifier_version,
		           resume_category_failure_code,
		           resume_category_started_at,
		           resume_category_resolved_at,
		           job_title,
		           job_description`,
		userID,
		jobID,
		category,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.JobResumeCategory{}, ErrGenerationJobNotFound
	}
	return state, err
}

func ClaimJobResumeCategory(
	ctx context.Context,
	userID string,
	jobID string,
	classifierModel string,
	classifierVersion int,
) (models.JobResumeCategory, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.JobResumeCategory{}, err
	}
	defer tx.Rollback(ctx)
	now := time.Now().UTC()
	quota, err := lockAndNormalizeJobClassificationQuota(ctx, tx, userID, now)
	if err != nil {
		return models.JobResumeCategory{}, err
	}

	state, err := scanJobResumeCategory(tx.QueryRow(
		ctx,
		`SELECT seek_job_id,
		        resume_category_status,
		        resume_category,
		        resume_category_source,
		        resume_category_confidence,
		        resume_category_classifier_model,
		        resume_category_classifier_version,
		        resume_category_failure_code,
		        resume_category_started_at,
		        resume_category_resolved_at,
		        job_title,
		        job_description
		 FROM jobs
		 WHERE user_id = $1 AND seek_job_id = $2
		 FOR UPDATE`,
		userID,
		jobID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.JobResumeCategory{}, ErrGenerationJobNotFound
	}
	if err != nil {
		return models.JobResumeCategory{}, err
	}

	if shouldClaimJobResumeCategory(state, classifierModel, classifierVersion, now) {
		if quota.Used >= quota.Limit {
			if state.Status == "classified" && state.Category != nil {
				if err := tx.Commit(ctx); err != nil {
					return models.JobResumeCategory{}, err
				}
				return state, nil
			}
			return models.JobResumeCategory{}, ErrJobClassificationQuotaExceeded
		}
		_, err = tx.Exec(
			ctx,
			`UPDATE jobs
			 SET resume_category = NULL,
			     resume_category_source = NULL,
			     resume_category_confidence = NULL,
			     resume_category_status = 'classifying',
			     resume_category_classifier_model = $3,
			     resume_category_classifier_version = $4,
			     resume_category_failure_code = NULL,
			     resume_category_started_at = $5,
			     resume_category_resolved_at = NULL
			 WHERE user_id = $1 AND seek_job_id = $2`,
			userID,
			jobID,
			classifierModel,
			classifierVersion,
			now,
		)
		if err != nil {
			return models.JobResumeCategory{}, err
		}
		_, err = tx.Exec(
			ctx,
			`UPDATE profiles
			 SET job_classifications_used = job_classifications_used + 1,
			     updated_at = now()
			 WHERE user_id = $1`,
			userID,
		)
		if err != nil {
			return models.JobResumeCategory{}, err
		}
		state.Category = nil
		state.Source = nil
		state.Confidence = nil
		state.Status = "classifying"
		state.ClassifierModel = &classifierModel
		state.ClassifierVersion = &classifierVersion
		state.FailureCode = nil
		startedAt := now.Format(time.RFC3339Nano)
		state.StartedAt = &startedAt
		state.ResolvedAt = nil
		state.Claimed = true
	}

	if err := tx.Commit(ctx); err != nil {
		return models.JobResumeCategory{}, err
	}
	return state, nil
}

func lockAndNormalizeJobClassificationQuota(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	now time.Time,
) (jobClassificationQuota, error) {
	var quota jobClassificationQuota
	err := tx.QueryRow(
		ctx,
		`SELECT job_classifications_used,
		        job_classifications_limit,
		        job_classification_period_start,
		        job_classification_period_end
		 FROM profiles
		 WHERE user_id = $1
		 FOR UPDATE`,
		userID,
	).Scan(&quota.Used, &quota.Limit, &quota.PeriodStart, &quota.PeriodEnd)
	if errors.Is(err, pgx.ErrNoRows) {
		return jobClassificationQuota{}, ErrProfileNotFound
	}
	if err != nil {
		return jobClassificationQuota{}, err
	}

	normalized, reset := normalizeJobClassificationQuota(quota, now)
	if !reset {
		return normalized, nil
	}
	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET job_classifications_used = 0,
		     job_classification_period_start = $2,
		     job_classification_period_end = $3,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		normalized.PeriodStart,
		normalized.PeriodEnd,
	)
	if err != nil {
		return jobClassificationQuota{}, err
	}
	return normalized, nil
}

func normalizeJobClassificationQuota(quota jobClassificationQuota, now time.Time) (jobClassificationQuota, bool) {
	if quota.PeriodEnd.After(now) && quota.PeriodEnd.After(quota.PeriodStart) {
		return quota, false
	}
	quota.Used = 0
	quota.PeriodStart = now
	quota.PeriodEnd = now.Add(jobClassificationUsagePeriod)
	return quota, true
}

func shouldClaimJobResumeCategory(
	state models.JobResumeCategory,
	classifierModel string,
	classifierVersion int,
	now time.Time,
) bool {
	switch state.Status {
	case "unclassified", "failed":
		return true
	case "classifying":
		if state.StartedAt == nil {
			return true
		}
		startedAt, err := time.Parse(time.RFC3339Nano, *state.StartedAt)
		return err != nil || !startedAt.Add(jobResumeCategoryClaimTimeout).After(now)
	case "classified":
		if state.Source == nil || *state.Source != "ai" {
			return false
		}
		return state.ClassifierModel == nil ||
			*state.ClassifierModel != classifierModel ||
			state.ClassifierVersion == nil ||
			*state.ClassifierVersion != classifierVersion
	default:
		return false
	}
}

func CompleteJobResumeCategory(
	ctx context.Context,
	userID string,
	jobID string,
	category models.ResumeCategory,
	confidence float64,
) (models.JobResumeCategory, error) {
	state, err := scanJobResumeCategory(Conn.QueryRow(
		ctx,
		`UPDATE jobs
		 SET resume_category = $3,
		     resume_category_source = 'ai',
		     resume_category_confidence = $4,
		     resume_category_status = 'classified',
		     resume_category_failure_code = NULL,
		     resume_category_resolved_at = now()
		 WHERE user_id = $1
		   AND seek_job_id = $2
		   AND resume_category_status = 'classifying'
		   AND resume_category IS NULL
		   AND resume_category_source IS NULL
		 RETURNING seek_job_id,
		           resume_category_status,
		           resume_category,
		           resume_category_source,
		           resume_category_confidence,
		           resume_category_classifier_model,
		           resume_category_classifier_version,
		           resume_category_failure_code,
		           resume_category_started_at,
		           resume_category_resolved_at,
		           job_title,
		           job_description`,
		userID,
		jobID,
		category,
		confidence,
	))
	if err == nil {
		return state, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.JobResumeCategory{}, err
	}
	return GetJobResumeCategory(ctx, userID, jobID)
}

func FailJobResumeCategory(
	ctx context.Context,
	userID string,
	jobID string,
	failureCode string,
	confidence *float64,
) (models.JobResumeCategory, error) {
	state, err := scanJobResumeCategory(Conn.QueryRow(
		ctx,
		`UPDATE jobs
		 SET resume_category_confidence = $3,
		     resume_category_status = 'failed',
		     resume_category_failure_code = $4,
		     resume_category_resolved_at = now()
		 WHERE user_id = $1
		   AND seek_job_id = $2
		   AND resume_category_status = 'classifying'
		   AND resume_category IS NULL
		   AND resume_category_source IS NULL
		 RETURNING seek_job_id,
		           resume_category_status,
		           resume_category,
		           resume_category_source,
		           resume_category_confidence,
		           resume_category_classifier_model,
		           resume_category_classifier_version,
		           resume_category_failure_code,
		           resume_category_started_at,
		           resume_category_resolved_at,
		           job_title,
		           job_description`,
		userID,
		jobID,
		confidence,
		failureCode,
	))
	if err == nil {
		return state, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return models.JobResumeCategory{}, err
	}
	return GetJobResumeCategory(ctx, userID, jobID)
}

func scanJobResumeCategory(row categoryRowScanner) (models.JobResumeCategory, error) {
	var state models.JobResumeCategory
	var category sql.NullString
	var source sql.NullString
	var confidence sql.NullFloat64
	var classifierModel sql.NullString
	var classifierVersion sql.NullInt64
	var failureCode sql.NullString
	var startedAt sql.NullTime
	var resolvedAt sql.NullTime

	err := row.Scan(
		&state.JobID,
		&state.Status,
		&category,
		&source,
		&confidence,
		&classifierModel,
		&classifierVersion,
		&failureCode,
		&startedAt,
		&resolvedAt,
		&state.JobTitle,
		&state.JobDescription,
	)
	if err != nil {
		return models.JobResumeCategory{}, err
	}
	if category.Valid {
		value := models.ResumeCategory(category.String)
		state.Category = &value
	}
	if source.Valid {
		state.Source = &source.String
	}
	if confidence.Valid {
		state.Confidence = &confidence.Float64
	}
	if classifierModel.Valid {
		state.ClassifierModel = &classifierModel.String
	}
	if classifierVersion.Valid {
		value := int(classifierVersion.Int64)
		state.ClassifierVersion = &value
	}
	if failureCode.Valid {
		state.FailureCode = &failureCode.String
	}
	if startedAt.Valid {
		value := startedAt.Time.UTC().Format(time.RFC3339Nano)
		state.StartedAt = &value
	}
	if resolvedAt.Valid {
		value := resolvedAt.Time.UTC().Format(time.RFC3339Nano)
		state.ResolvedAt = &value
	}
	return state, nil
}
