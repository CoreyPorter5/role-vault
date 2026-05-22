//The Queries: All your SQL INSERT and SELECT statements live here

package db

import (
	"context"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
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
	query := `DELETE FROM jobs WHERE user_id = $1 AND seek_job_id = $2`
	commandTag, err := Conn.Exec(context.Background(), query, userID, jobID)
	if err != nil {
		fmt.Printf("Database error deleting job %s: %v\n", jobID, err)
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Item %s does not exist for user %v in DB\n", jobID, userID)
		return false, nil
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
