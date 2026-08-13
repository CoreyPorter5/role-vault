package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func GetResumeLibraryItems(ctx context.Context, userID string) ([]models.JobLibraryItem, error) {
	var libraryItems []models.JobLibraryItem
	query := `SELECT j.seek_job_id, j.job_title, j.company_name, j.location, j.company_logo,
	                 j.status, j.date_synced::text, gr.updated_at::text, gr.storage_path,
	                 gr.original_filename, gr.resume_category, gr.profile_version, gr.template_version,
	                 cl.updated_at::text, cl.template_version,
	                 cld.updated_at::text, cld.expires_at::text, cld.template_version
	          FROM jobs j
	          LEFT JOIN user_generated_resumes gr
	            ON j.user_id = gr.user_id AND j.seek_job_id = gr.seek_job_id
	          LEFT JOIN user_generated_cover_letters cl
	            ON j.user_id = cl.user_id AND j.seek_job_id = cl.seek_job_id
	          LEFT JOIN user_generated_cover_letter_drafts cld
	            ON j.user_id = cld.user_id AND j.seek_job_id = cld.seek_job_id
	           AND cld.expires_at > now()
	          WHERE j.user_id = $1
	          ORDER BY j.date_synced DESC
`
	rows, err := Conn.Query(ctx, query, userID)
	if err != nil {
		return libraryItems, err
	}

	defer rows.Close()

	for rows.Next() {
		var libraryItem models.JobLibraryItem

		var resumeUpdatedAt sql.NullString
		var resumeStoragePath sql.NullString
		var resumeOriginalFilename sql.NullString
		var resumeCategory sql.NullString
		var profileVersion sql.NullInt64
		var templateVersion sql.NullString
		var coverLetterUpdatedAt sql.NullString
		var coverLetterTemplateVersion sql.NullString
		var coverLetterDraftUpdatedAt sql.NullString
		var coverLetterDraftExpiresAt sql.NullString
		var coverLetterDraftTemplateVersion sql.NullString

		err := rows.Scan(
			&libraryItem.JobID,
			&libraryItem.JobTitle,
			&libraryItem.CompanyName,
			&libraryItem.Location,
			&libraryItem.Logo,
			&libraryItem.Status,
			&libraryItem.DateSynced,

			&resumeUpdatedAt,
			&resumeStoragePath,
			&resumeOriginalFilename,
			&resumeCategory,
			&profileVersion,
			&templateVersion,
			&coverLetterUpdatedAt,
			&coverLetterTemplateVersion,
			&coverLetterDraftUpdatedAt,
			&coverLetterDraftExpiresAt,
			&coverLetterDraftTemplateVersion,
		)
		if err != nil {
			return nil, fmt.Errorf("scan resume library item: %w", err)
		}
		if resumeStoragePath.Valid {
			libraryItem.Resume.Exists = true
			libraryItem.Resume.UpdatedAt = resumeUpdatedAt.String
			libraryItem.Resume.StoragePath = resumeStoragePath.String
			libraryItem.Resume.OriginalFilename = resumeOriginalFilename.String
			libraryItem.Resume.ResumeCategory = models.ResumeCategory(resumeCategory.String)
			libraryItem.Resume.ProfileVersion = int(profileVersion.Int64)
			libraryItem.Resume.TemplateVersion = templateVersion.String
		} else {
			libraryItem.Resume.Exists = false
		}
		switch {
		case coverLetterDraftUpdatedAt.Valid:
			libraryItem.CoverLetter.Status = "draft"
			libraryItem.CoverLetter.UpdatedAt = coverLetterDraftUpdatedAt.String
			libraryItem.CoverLetter.ExpiresAt = coverLetterDraftExpiresAt.String
			libraryItem.CoverLetter.TemplateVersion = coverLetterDraftTemplateVersion.String
		case coverLetterUpdatedAt.Valid:
			libraryItem.CoverLetter.Status = "saved"
			libraryItem.CoverLetter.UpdatedAt = coverLetterUpdatedAt.String
			libraryItem.CoverLetter.TemplateVersion = coverLetterTemplateVersion.String
		default:
			libraryItem.CoverLetter.Status = "not_created"
		}
		libraryItems = append(libraryItems, libraryItem)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate resume library items: %w", err)
	}
	return libraryItems, nil

}
