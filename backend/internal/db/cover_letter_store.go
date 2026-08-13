package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

func GetGeneratedCoverLetterDraft(ctx context.Context, userID, jobID string) (models.CoverLetterDocument, error) {
	var document models.CoverLetterDocument
	var coverLetterJSON []byte
	var expiresAt string
	err := Conn.QueryRow(
		ctx,
		`SELECT cover_letter_json, template_version, updated_at::text, expires_at::text
		 FROM user_generated_cover_letter_drafts
		 WHERE user_id = $1 AND seek_job_id = $2 AND expires_at > now()`,
		userID,
		jobID,
	).Scan(&coverLetterJSON, &document.TemplateVersion, &document.UpdatedAt, &expiresAt)
	if err != nil {
		return document, err
	}
	if err := json.Unmarshal(coverLetterJSON, &document.CoverLetter); err != nil {
		return models.CoverLetterDocument{}, fmt.Errorf("decode generated cover letter draft: %w", err)
	}
	document.ExpiresAt = &expiresAt
	return document, nil
}

func GetGeneratedCoverLetter(ctx context.Context, userID, jobID string) (models.CoverLetterDocument, error) {
	var document models.CoverLetterDocument
	var coverLetterJSON []byte
	err := Conn.QueryRow(
		ctx,
		`SELECT cover_letter_json, template_version, updated_at::text
		 FROM user_generated_cover_letters
		 WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	).Scan(&coverLetterJSON, &document.TemplateVersion, &document.UpdatedAt)
	if err != nil {
		return document, err
	}
	if err := json.Unmarshal(coverLetterJSON, &document.CoverLetter); err != nil {
		return models.CoverLetterDocument{}, fmt.Errorf("decode generated cover letter: %w", err)
	}
	return document, nil
}

func GetLatestTailoredResumeForJob(ctx context.Context, userID, jobID string) (*models.TailoredResume, error) {
	var resumeJSON []byte
	err := Conn.QueryRow(
		ctx,
		`SELECT resume_json
		 FROM (
		   SELECT resume_json, updated_at, 0 AS source_priority
		   FROM user_generated_resume_drafts
		   WHERE user_id = $1 AND seek_job_id = $2 AND expires_at > now()
		   UNION ALL
		   SELECT resume_json, updated_at, 1 AS source_priority
		   FROM user_generated_resumes
		   WHERE user_id = $1 AND seek_job_id = $2
		 ) resumes
		 ORDER BY source_priority, updated_at DESC
		 LIMIT 1`,
		userID,
		jobID,
	).Scan(&resumeJSON)
	if err != nil {
		return nil, err
	}
	var resume models.TailoredResume
	if err := json.Unmarshal(resumeJSON, &resume); err != nil {
		return nil, fmt.Errorf("decode tailored resume for cover letter: %w", err)
	}
	return &resume, nil
}

func SaveGeneratedCoverLetter(ctx context.Context, userID, jobID string, coverLetter models.CoverLetter) error {
	coverLetterJSON, err := json.Marshal(coverLetter)
	if err != nil {
		return fmt.Errorf("encode generated cover letter: %w", err)
	}

	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin generated cover letter transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var ownsJob bool
	if err := tx.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM jobs WHERE user_id = $1 AND seek_job_id = $2)`,
		userID,
		jobID,
	).Scan(&ownsJob); err != nil {
		return fmt.Errorf("verify generated cover letter job: %w", err)
	}
	if !ownsJob {
		return ErrGenerationJobNotFound
	}

	var templateVersion string
	err = tx.QueryRow(
		ctx,
		`SELECT template_version
		 FROM user_generated_cover_letter_drafts
		 WHERE user_id = $1 AND seek_job_id = $2 AND expires_at > now()
		 FOR UPDATE`,
		userID,
		jobID,
	).Scan(&templateVersion)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(
			ctx,
			`SELECT template_version
			 FROM user_generated_cover_letters
			 WHERE user_id = $1 AND seek_job_id = $2
			 FOR UPDATE`,
			userID,
			jobID,
		).Scan(&templateVersion)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrCoverLetterDraftNotFound
	}
	if err != nil {
		return fmt.Errorf("read generated cover letter template: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO user_generated_cover_letters (
		   user_id, seek_job_id, cover_letter_json, template_version, created_at, updated_at
		 ) VALUES ($1, $2, $3::jsonb, $4, now(), now())
		 ON CONFLICT (user_id, seek_job_id)
		 DO UPDATE SET
		   cover_letter_json = EXCLUDED.cover_letter_json,
		   template_version = EXCLUDED.template_version,
		   updated_at = now()`,
		userID,
		jobID,
		string(coverLetterJSON),
		templateVersion,
	); err != nil {
		return fmt.Errorf("save generated cover letter: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		`DELETE FROM user_generated_cover_letter_drafts WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	); err != nil {
		return fmt.Errorf("delete generated cover letter draft after save: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit generated cover letter: %w", err)
	}
	return nil
}

func DeleteGeneratedCoverLetterDraft(ctx context.Context, userID, jobID string) (bool, error) {
	result, err := Conn.Exec(
		ctx,
		`DELETE FROM user_generated_cover_letter_drafts WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	)
	return result.RowsAffected() > 0, err
}

func DeleteGeneratedCoverLetter(ctx context.Context, userID, jobID string) (bool, error) {
	result, err := Conn.Exec(
		ctx,
		`DELETE FROM user_generated_cover_letters WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	)
	return result.RowsAffected() > 0, err
}
