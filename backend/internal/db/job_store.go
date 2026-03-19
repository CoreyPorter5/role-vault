//The Queries: All your SQL INSERT and SELECT statements live here

package db

import (
	"sync"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

//Create mock local DB

var (
	userJobs = make(map[string][]models.Job)
	mu       sync.RWMutex
)

func AddUserJob(userID string, job models.Job) {
	mu.Lock()
	defer mu.Unlock()
	userJobs[userID] = append(userJobs[userID], job)

}

func GetUserJobs(userID string) []models.Job {
	mu.RLock()
	defer mu.RUnlock()
	return userJobs[userID]
}

func DeleteUserJob(userID string, jobID string) bool {
	mu.Lock()
	defer mu.Unlock()

	jobs := userJobs[userID]

	for i, job := range jobs {
		if job.JobID == jobID {
			userJobs[userID] = append(jobs[:i], jobs[i+1:]...)
			return true
		}

	}

	return false

}
