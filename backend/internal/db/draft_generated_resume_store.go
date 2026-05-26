package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func AddGeneratedUserResumeDraft(userID string, jobID string, resumeJson models.TailoredResume) (bool, error) {
	now := time.Now().UTC()
	oneMonthFromNow := now.AddDate(0, 1, 0)

	resumeJsonBytes, err := json.Marshal(resumeJson)
	if err != nil {
		return false, fmt.Errorf("failed to marshal resume JSON: %w", err)
	}

	query := `INSERT INTO user_generated_resume_drafts (user_id, seek_job_id, resume_json, created_at, updated_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, seek_job_id) DO UPDATE SET resume_json = EXCLUDED.resume_json, updated_at = EXCLUDED.updated_at, expires_at = EXCLUDED.expires_at`

	commandTag, tableErr := Conn.Exec(context.Background(), query, userID, jobID, resumeJsonBytes, now, now, oneMonthFromNow)

	if tableErr != nil {
		fmt.Printf("Database error adding generated resume to drafts for user %s: %v\n", userID, tableErr)
		return false, tableErr
	}

	if commandTag.RowsAffected() == 0 {
		return false, nil
	}

	fmt.Printf("Successfully saved generated resume draft for user %s\n", userID)
	return true, nil
}

func GetGeneratedUserResumeDrafts(userID string) ([]models.JobLibraryItemDraft, error) {
	var draftLibraryItems []models.JobLibraryItemDraft
	query := `SELECT j.seek_job_id, j.job_title, j.company_name, j.location, j.company_logo, j.status, j.date_synced::text, grd.id, grd.created_at::text, grd.updated_at::text, grd.expires_at::text FROM user_generated_resume_drafts grd JOIN jobs j ON j.user_id = grd.user_id AND j.seek_job_id = grd.seek_job_id WHERE grd.user_id = $1 AND grd.expires_at > now() ORDER BY grd.updated_at DESC`
	rows, err := Conn.Query(context.Background(), query, userID)
	if err != nil {
		fmt.Printf("Database error getting draft library items for user %s: %v\n", userID, err)
		return draftLibraryItems, err
	}

	defer rows.Close()

	for rows.Next() {
		var draftLibraryItem models.JobLibraryItemDraft

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
		)
		if err != nil {
			fmt.Printf("Database error getting job for user %s: %v\n", userID, err)
			continue
		}

		draftLibraryItems = append(draftLibraryItems, draftLibraryItem)
	}
	return draftLibraryItems, nil

}

func GetGeneratedUserResumeDraft(userID string, draftID string) (models.TailoredResume, error) {
	var resume models.TailoredResume
	var resumeJSONBytes []byte
	query := `SELECT resume_json FROM user_generated_resume_drafts WHERE id = $1 AND user_id = $2`
	err := Conn.QueryRow(context.Background(), query, draftID, userID).Scan(&resumeJSONBytes)
	if err != nil {
		fmt.Printf("Database error getting draft JSON generated resume for user %s: %s\n", userID, err)
		return resume, err
	}
	if err := json.Unmarshal(resumeJSONBytes, &resume); err != nil {
		fmt.Printf("Error unmarshalling JSON draft for user %s: %s\n", userID, err)
		return resume, err
	}

	return resume, nil
}

func DeleteGeneratedUserResumeDraft(userID string, jobID string) (bool, error) {
	query := `DELETE FROM user_generated_resume_drafts WHERE seek_job_id = $1 AND user_id = $2`
	commandTag, err := Conn.Exec(context.Background(), query, jobID, userID)
	if err != nil {
		fmt.Printf("Database error deleting draft resume %s: %v\n", jobID, err)
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Draft item %s does not exist for user %v in DB\n", jobID, userID)
		return false, nil
	}
	fmt.Printf("Successfully deleted draft item %s for user %s\n", jobID, userID)
	return true, nil

}
