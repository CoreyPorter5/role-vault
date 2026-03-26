//The Queries: All your SQL INSERT and SELECT statements live here

package db

import (
	"context"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func AddUserJob(userID string, job models.Job) bool {

	query := `INSERT INTO jobs (user_id, seek_job_id, job_title, company_name, location, job_type, job_pay, job_description, company_logo, date_synced) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := Conn.Exec(context.Background(), query, userID, job.JobID, job.JobTitle, job.CompanyName, job.Location, job.JobType, job.Pay, job.Description, job.Logo, job.DateSynced)

	if err != nil {
		fmt.Printf("Database error adding job %s: %v\n", job.JobID, err)
		return false
	}
	fmt.Printf("Successfully saved job %s for user %s\n", job.JobID, userID)
	return true
}

func GetUserJobs(userID string) []models.Job {
	var userJobs []models.Job
	query := `SELECT seek_job_id, job_title, company_name, location, job_type, job_pay, job_description, company_logo, date_synced::text FROM jobs WHERE user_id = $1 ORDER BY date_synced DESC`
	rows, err := Conn.Query(context.Background(), query, userID)
	if err != nil {
		fmt.Printf("Database error fetching jobs for user %s: %v\n", userID, err)
		return userJobs
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
		)
		if err != nil {
			fmt.Printf("Database error getting job for user %s: %v\n", userID, err)
			continue
		}
		userJobs = append(userJobs, job)
	}
	return userJobs

}

func DeleteUserJob(userID string, jobID string) bool {
	query := `DELETE FROM jobs WHERE user_id = $1 AND seek_job_id = $2`
	commandTag, err := Conn.Exec(context.Background(), query, userID, jobID)
	if err != nil {
		fmt.Printf("Database error deleting job %s: %v\n", jobID, err)
		return false
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Item %s does not exist for user %v in DB", jobID, userID)
		return false
	}
	fmt.Printf("Successfully deleted job %s for user %s\n", jobID, userID)
	return true
}
