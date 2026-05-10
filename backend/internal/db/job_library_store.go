package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func GetResumeLibraryItems(userID string) ([]models.JobLibraryItem, error) {
	var libraryItems []models.JobLibraryItem
	query := `SELECT j.seek_job_id, j.job_title, j.company_name, j.location, j.company_logo, j.status, j.date_synced::text, gr.updated_at::text, gr.storage_path, gr.original_filename FROM jobs j LEFT JOIN user_generated_resumes gr ON j.user_id = gr.user_id AND j.seek_job_id = gr.seek_job_id WHERE j.user_id = $1 ORDER BY j.date_synced DESC
`
	rows, err := Conn.Query(context.Background(), query, userID)
	if err != nil {
		fmt.Printf("Database error getting library items for user %s: %v\n", userID, err)
		return libraryItems, err
	}

	defer rows.Close()

	for rows.Next() {
		var libraryItem models.JobLibraryItem

		var resumeUpdatedAt sql.NullString
		var resumeStoragePath sql.NullString
		var resumeOriginalFilename sql.NullString

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
		)
		if err != nil {
			fmt.Printf("Database error getting job for user %s: %v\n", userID, err)
			continue
		}
		if resumeStoragePath.Valid {
			libraryItem.Resume.Exists = true
			libraryItem.Resume.UpdatedAt = resumeUpdatedAt.String
			libraryItem.Resume.StoragePath = resumeStoragePath.String
			libraryItem.Resume.OriginalFilename = resumeOriginalFilename.String
		} else {
			libraryItem.Resume.Exists = false
		}
		libraryItems = append(libraryItems, libraryItem)
	}
	return libraryItems, nil

}
