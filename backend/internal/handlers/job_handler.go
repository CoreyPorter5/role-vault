//Receives the POST request, calls the DB, returns JSON

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

func AddUserJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	var incomingJob models.Job                          //The expected structure of what the nextjs post request is sending
	err := json.NewDecoder(r.Body).Decode(&incomingJob) //Reads the post request in r.Body by decoding its JSON. It fills in the empty message struct with this decoded data by passing its reference in (so it doesnt duplicate the struct in memory)
	if err != nil {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json") //Sets the response content type to JSON which is what we are about to send back to nextjs

	success := db.AddUserJob(userID, incomingJob) //Adds user job
	if !success {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"code":         "DUPLICATE_JOB",
			"message":      "You have already synced this job",
			"conflictedId": incomingJob.JobID,
		})
		return
	}

	w.WriteHeader(http.StatusCreated)      //Sets the HTTP status code to 201 Created (typical for a successful POST request)
	json.NewEncoder(w).Encode(incomingJob) //Encodes the message struct back to JSONand writes it to the response body so the client recieves it back. We can send anything such as "status":"ok" or anything back or nothing.
}

func GetUserJobs(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	userJobs, err := db.GetUserJobs(userID)

	if userJobs == nil || err != nil {
		http.Error(w, "Invalid Request For User Jobs", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userJobs)
}

func DeleteUserJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	jobID := chi.URLParam(r, "jobID")

	success := db.DeleteUserJob(userID, jobID)
	if success {
		w.WriteHeader(http.StatusNoContent)
	} else {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

}

func UpdateJobStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	var incomingNewStatus models.Status
	err := json.NewDecoder(r.Body).Decode(&incomingNewStatus)
	if err != nil {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	jobID := chi.URLParam(r, "jobID")
	success := db.UpdateJobStatus(userID, jobID, incomingNewStatus.Status)
	if success {
		w.WriteHeader(http.StatusNoContent)
	} else {
		http.Error(w, "JobId or status not found", http.StatusNotFound)
		return
	}

}
