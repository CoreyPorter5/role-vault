package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func AddGeneratedUserResumeDraft(
	ctx context.Context,
	userID string,
	jobID string,
	resumeJson models.TailoredResume,
	resumeCategory models.ResumeCategory,
	profileVersion int,
	templateVersion string,
) (bool, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(30 * 24 * time.Hour)

	resumeJsonBytes, err := json.Marshal(resumeJson)
	if err != nil {
		return false, fmt.Errorf("failed to marshal resume JSON: %w", err)
	}

	query := `INSERT INTO user_generated_resume_drafts (
	            user_id, seek_job_id, resume_json, resume_category,
	            profile_version, template_version, created_at, updated_at, expires_at
	          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	          ON CONFLICT (user_id, seek_job_id) DO UPDATE SET
	            resume_json = EXCLUDED.resume_json,
	            resume_category = EXCLUDED.resume_category,
	            profile_version = EXCLUDED.profile_version,
	            template_version = EXCLUDED.template_version,
	            updated_at = EXCLUDED.updated_at,
	            expires_at = EXCLUDED.expires_at`

	commandTag, tableErr := Conn.Exec(
		ctx,
		query,
		userID,
		jobID,
		resumeJsonBytes,
		resumeCategory,
		profileVersion,
		templateVersion,
		now,
		now,
		expiresAt,
	)

	if tableErr != nil {
		return false, tableErr
	}

	if commandTag.RowsAffected() == 0 {
		return false, nil
	}

	return true, nil
}

func GetGeneratedUserResumeDrafts(ctx context.Context, userID string) ([]models.JobLibraryItemDraft, error) {
	var draftLibraryItems []models.JobLibraryItemDraft
	query := `SELECT j.seek_job_id, j.job_title, j.company_name, j.location, j.company_logo,
	                 j.status, j.date_synced::text, grd.id, grd.created_at::text,
	                 grd.updated_at::text, grd.expires_at::text, grd.resume_category,
	                 grd.profile_version, grd.template_version,
	                 cl.updated_at::text, cl.template_version,
	                 cld.updated_at::text, cld.expires_at::text, cld.template_version
	          FROM user_generated_resume_drafts grd
	          JOIN jobs j ON j.user_id = grd.user_id AND j.seek_job_id = grd.seek_job_id
	          LEFT JOIN user_generated_cover_letters cl
	            ON j.user_id = cl.user_id AND j.seek_job_id = cl.seek_job_id
	          LEFT JOIN user_generated_cover_letter_drafts cld
	            ON j.user_id = cld.user_id AND j.seek_job_id = cld.seek_job_id
	           AND cld.expires_at > now()
	          WHERE grd.user_id = $1 AND grd.expires_at > now()
	          ORDER BY grd.updated_at DESC`
	rows, err := Conn.Query(ctx, query, userID)
	if err != nil {
		return draftLibraryItems, err
	}

	defer rows.Close()

	for rows.Next() {
		var draftLibraryItem models.JobLibraryItemDraft
		var coverLetterUpdatedAt sql.NullString
		var coverLetterTemplateVersion sql.NullString
		var coverLetterDraftUpdatedAt sql.NullString
		var coverLetterDraftExpiresAt sql.NullString
		var coverLetterDraftTemplateVersion sql.NullString

		err := rows.Scan(
			&draftLibraryItem.JobID,
			&draftLibraryItem.JobTitle,
			&draftLibraryItem.CompanyName,
			&draftLibraryItem.Location,
			&draftLibraryItem.Logo,
			&draftLibraryItem.Status,
			&draftLibraryItem.DateSynced,
			&draftLibraryItem.DraftID,
			&draftLibraryItem.DraftCreatedAt,
			&draftLibraryItem.DraftUpdatedAt,
			&draftLibraryItem.DraftExpiresAt,
			&draftLibraryItem.ResumeCategory,
			&draftLibraryItem.ProfileVersion,
			&draftLibraryItem.TemplateVersion,
			&coverLetterUpdatedAt,
			&coverLetterTemplateVersion,
			&coverLetterDraftUpdatedAt,
			&coverLetterDraftExpiresAt,
			&coverLetterDraftTemplateVersion,
		)
		if err != nil {
			return nil, fmt.Errorf("scan generated resume draft: %w", err)
		}
		switch {
		case coverLetterDraftUpdatedAt.Valid:
			draftLibraryItem.CoverLetter.Status = "draft"
			draftLibraryItem.CoverLetter.UpdatedAt = coverLetterDraftUpdatedAt.String
			draftLibraryItem.CoverLetter.ExpiresAt = coverLetterDraftExpiresAt.String
			draftLibraryItem.CoverLetter.TemplateVersion = coverLetterDraftTemplateVersion.String
		case coverLetterUpdatedAt.Valid:
			draftLibraryItem.CoverLetter.Status = "saved"
			draftLibraryItem.CoverLetter.UpdatedAt = coverLetterUpdatedAt.String
			draftLibraryItem.CoverLetter.TemplateVersion = coverLetterTemplateVersion.String
		default:
			draftLibraryItem.CoverLetter.Status = "not_created"
		}

		draftLibraryItems = append(draftLibraryItems, draftLibraryItem)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate generated resume drafts: %w", err)
	}
	return draftLibraryItems, nil

}

func GetGeneratedUserResumeDraft(ctx context.Context, userID string, draftID string) (models.TailoredResume, error) {
	var resume models.TailoredResume
	var resumeJSONBytes []byte
	query := `SELECT resume_json FROM user_generated_resume_drafts WHERE id = $1 AND user_id = $2 AND expires_at > now()`
	err := Conn.QueryRow(ctx, query, draftID, userID).Scan(&resumeJSONBytes)
	if err != nil {
		return resume, err
	}
	if err := json.Unmarshal(resumeJSONBytes, &resume); err != nil {
		return resume, err
	}

	return resume, nil
}

func DeleteGeneratedUserResumeDraft(ctx context.Context, userID string, jobID string) (bool, error) {
	query := `DELETE FROM user_generated_resume_drafts WHERE seek_job_id = $1 AND user_id = $2`
	commandTag, err := Conn.Exec(ctx, query, jobID, userID)
	if err != nil {
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		return false, nil
	}
	return true, nil

}
