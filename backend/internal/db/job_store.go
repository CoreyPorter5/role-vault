//The Queries: All your SQL INSERT and SELECT statements live here

package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

func AddUserJob(userID string, job models.Job) (bool, error) {

	query := `INSERT INTO jobs (user_id, seek_job_id, job_title, company_name, location, job_type, job_pay, job_description, company_logo, date_synced) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := Conn.Exec(context.Background(), query, userID, job.JobID, job.JobTitle, job.CompanyName, job.Location, job.JobType, job.Pay, job.Description, job.Logo, job.DateSynced)

	if err != nil {
		fmt.Printf("Database error adding job %s: %v\n", job.JobID, err)
		return false, err
	}
	fmt.Printf("Successfully saved job %s for user %s\n", job.JobID, userID)
	return true, nil
}

func GetUserJobs(userID string) ([]models.Job, error) {
	userJobs := []models.Job{}
	query := `SELECT seek_job_id, job_title, company_name, location, job_type, job_pay, job_description, company_logo, date_synced::text, status FROM jobs WHERE user_id = $1 ORDER BY date_synced DESC`
	rows, err := Conn.Query(context.Background(), query, userID)
	if err != nil {
		fmt.Printf("Database error fetching jobs for user %s: %v\n", userID, err)
		return nil, err
	}

	defer rows.Close() //Otherwise server runs out of memory
	for rows.Next() {
		var job models.Job

		err := rows.Scan(
			&job.JobID,
			&job.JobTitle,
			&job.CompanyName,
			&job.Location,
			&job.JobType,
			&job.Pay,
			&job.Description,
			&job.Logo,
			&job.DateSynced,
			&job.Status,
		)
		if err != nil {
			fmt.Printf("Database error getting job for user %s: %v\n", userID, err)
			continue
		}
		userJobs = append(userJobs, job)
	}
	if err := rows.Err(); err != nil {
		fmt.Printf("Database row iteration error for user %s: %v\n", userID, err)
		return nil, err
	}

	return userJobs, nil

}

func DeleteUserJob(userID string, jobID string) (bool, error) {
	ctx := context.Background()
	tx, err := Conn.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin job deletion: %w", err)
	}
	defer tx.Rollback(ctx)

	var generatedResumePath sql.NullString
	err = tx.QueryRow(
		ctx,
		`SELECT generated.storage_path
		 FROM jobs job
		 LEFT JOIN user_generated_resumes generated
		   ON generated.user_id = job.user_id
		  AND generated.seek_job_id = job.seek_job_id
		 WHERE job.user_id = $1 AND job.seek_job_id = $2
		 FOR UPDATE OF job`,
		userID,
		jobID,
	).Scan(&generatedResumePath)
	if errors.Is(err, pgx.ErrNoRows) {
		fmt.Printf("Item %s does not exist for user %v in DB\n", jobID, userID)
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("lock job for deletion: %w", err)
	}

	jobScopedTables := []string{
		"resume_generation_attempts",
		"user_generated_resume_drafts",
		"user_generated_resumes",
	}
	for _, table := range jobScopedTables {
		query := fmt.Sprintf("DELETE FROM %s WHERE user_id = $1 AND seek_job_id = $2", table)
		if _, err := tx.Exec(ctx, query, userID, jobID); err != nil {
			return false, fmt.Errorf("delete job data from %s: %w", table, err)
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM jobs WHERE user_id = $1 AND seek_job_id = $2`, userID, jobID); err != nil {
		return false, fmt.Errorf("delete job: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit job deletion: %w", err)
	}

	if generatedResumePath.Valid && StorageClient != nil {
		bucketID := os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID")
		if _, err := StorageClient.RemoveFile(bucketID, []string{generatedResumePath.String}); err != nil {
			fmt.Printf("Warning: deleted job %s but failed to remove generated resume object for user %s: %v\n", jobID, userID, err)
		}
	}
	fmt.Printf("Successfully deleted job %s for user %s\n", jobID, userID)
	return true, nil
}

func UpdateJobStatus(userID string, jobID string, newStatus models.JobStatus) (bool, error) {
	query := `UPDATE jobs SET status = $1 WHERE user_id = $2 AND seek_job_id = $3`
	commandTag, err := Conn.Exec(context.Background(), query, newStatus, userID, jobID)
	if err != nil {
		fmt.Printf("Database error updating job status %s: %v\n", jobID, err)
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Item %s does not exist for user %v in DB\n", jobID, userID)
		return false, nil
	}
	fmt.Printf("Successfully updated job status %s for user %s\n", jobID, userID)
	return true, nil
}

func GetUserJob(userID string, jobID string) (models.Job, error) {
	var job models.Job
	query := `SELECT seek_job_id, job_title, company_name, location, job_type, job_pay, job_description, company_logo, date_synced::text, status FROM jobs WHERE user_id = $1 AND seek_job_id = $2`
	row := Conn.QueryRow(context.Background(), query, userID, jobID)
	err := row.Scan(
		&job.JobID,
		&job.JobTitle,
		&job.CompanyName,
		&job.Location,
		&job.JobType,
		&job.Pay,
		&job.Description,
		&job.Logo,
		&job.DateSynced,
		&job.Status,
	)
	if err != nil {
		fmt.Printf("Database error getting job %x for user %s: %v\n", jobID, userID, err)
		return job, err
	}

	return job, nil

}
