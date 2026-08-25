//Receives the POST request, calls the DB, returns JSON

package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/analytics"
	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const maxJobJSONBodyBytes int64 = 1 << 20

func AddUserJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxJobJSONBodyBytes)
	var incomingJob models.Job                          //The expected structure of what the nextjs post request is sending
	err := json.NewDecoder(r.Body).Decode(&incomingJob) //Reads the post request in r.Body by decoding its JSON. It fills in the empty message struct with this decoded data by passing its reference in (so it doesnt duplicate the struct in memory)
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "Request body too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json") //Sets the response content type to JSON which is what we are about to send back to nextjs

	success, err := db.AddUserJob(r.Context(), userID, incomingJob) //Adds user job
	if err != nil {
		var postgresError *pgconn.PgError
		if !errors.As(err, &postgresError) || postgresError.Code != "23505" {
			captureHandlerError(r, observability.CodeJobStoreFailed, err, "jobs", "create")
			http.Error(w, "Failed to save job", http.StatusInternalServerError)
			return
		}
	}
	if !success || err != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"code":         "DUPLICATE_JOB",
			"message":      "You have already synced this job",
			"conflictedId": incomingJob.JobID,
		})
		return
	}
	analytics.Capture(userID, analytics.EventJobSynced, nil)

	w.WriteHeader(http.StatusCreated)      //Sets the HTTP status code to 201 Created (typical for a successful POST request)
	json.NewEncoder(w).Encode(incomingJob) //Encodes the message struct back to JSONand writes it to the response body so the client recieves it back. We can send anything such as "status":"ok" or anything back or nothing.
}

func GetUserJobs(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	userJobs, err := db.GetUserJobs(r.Context(), userID)

	if err != nil {
		captureHandlerError(r, observability.CodeJobStoreFailed, err, "jobs", "list")
		http.Error(w, "Invalid Request To Get User Jobs", http.StatusInternalServerError)
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
	jobID := chi.URLParam(r, "jobID")

	success, err := db.DeleteUserJob(r.Context(), userID, jobID)
	if err != nil {
		captureHandlerError(r, observability.CodeJobStoreFailed, err, "jobs", "delete")
		http.Error(w, "Failed to delete job", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func UpdateJobStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxJobJSONBodyBytes)
	var incomingNewStatus models.Status
	err := json.NewDecoder(r.Body).Decode(&incomingNewStatus)
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "Request body too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
	if !incomingNewStatus.Status.Valid() {
		http.Error(w, "Invalid job status", http.StatusBadRequest)
		return
	}

	jobID := chi.URLParam(r, "jobID")
	success, err := db.UpdateJobStatus(r.Context(), userID, jobID, incomingNewStatus.Status)
	if err != nil {
		captureHandlerError(r, observability.CodeJobStoreFailed, err, "jobs", "update_status")
		http.Error(w, "Failed to update job status", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "JobId or status not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
