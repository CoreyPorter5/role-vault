package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/CoreyPorter5/seek-sync/backend/internal/analytics"
	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

const maxResumeUpdateBodyBytes = int64(resumeupload.MaxPlaintextBytes*6 + 64*1024)

func AddUserResume(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "User ID not found in context")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, resumeupload.MaxMultipartBodyBytes)
	file, fileHeader, err := r.FormFile("resume")
	if err != nil {
		writeMultipartUploadError(w, err)
		return
	}
	defer file.Close()
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	prepared, err := resumeupload.PrepareDOCX(file, fileHeader, true)
	if err != nil {
		writeResumeUploadError(w, r, err)
		return
	}
	defer prepared.Cleanup()

	path, err := db.AddUserResume(r.Context(), userID, prepared)
	if err != nil {
		captureHandlerError(r, observability.CodeMasterResumeStoreFailed, err, "master_resume", "create")
		writeJSONError(w, http.StatusInternalServerError, "RESUME_STORE_ERROR", "Failed to save resume")
		return
	}
	analytics.Capture(userID, analytics.EventMasterResumeUploaded, analytics.Properties{"operation": "upload"})

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(path)
}

func GetUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	userResume, err := db.GetUserResume(r.Context(), userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Resume not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeMasterResumeStoreFailed, err, "master_resume", "read")
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userResume)

}

func UpdateUserResume(w http.ResponseWriter, r *http.Request) {
	var plaintextReq models.UpdateResumeRequest
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxResumeUpdateBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(&plaintextReq); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "Request body too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(plaintextReq.Plaintext) == "" {
		http.Error(w, "Plaintext resume cannot be empty", http.StatusBadRequest)
		return
	}
	if len(plaintextReq.Plaintext) > resumeupload.MaxPlaintextBytes {
		writeJSONError(w, http.StatusUnprocessableEntity, "RESUME_TEXT_TOO_LARGE", "Resume plaintext is too large")
		return
	}
	success, err := db.UpdateUserResume(r.Context(), userID, plaintextReq.Plaintext)
	if err != nil {
		captureHandlerError(r, observability.CodeMasterResumeStoreFailed, err, "master_resume", "update")
		http.Error(w, "Failed to update master resume", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "Master resume not found", http.StatusNotFound)
		return
	}
	analytics.Capture(userID, analytics.EventMasterResumeUploaded, analytics.Properties{"operation": "replace"})
	w.WriteHeader(http.StatusNoContent)

}

func DeleteUserResume(w http.ResponseWriter, r *http.Request) {
	return
}

func GetGenerationContext(w http.ResponseWriter, r *http.Request) {
	var generateResumeContext models.GenerateResumeContext
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	jobID := chi.URLParam(r, "jobID")
	if jobID == "" {
		http.Error(w, "jobID is required", http.StatusBadRequest)
		return
	}

	userResume, getResumeError := db.GetUserResume(r.Context(), userID)
	if getResumeError != nil {
		if errors.Is(getResumeError, pgx.ErrNoRows) {
			http.Error(w, "Resume not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeMasterResumeStoreFailed, getResumeError, "resume_generation_context", "read_master_resume")
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	job, getJobErr := db.GetUserJob(r.Context(), userID, jobID)
	if getJobErr != nil {
		if errors.Is(getJobErr, pgx.ErrNoRows) {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeJobStoreFailed, getJobErr, "resume_generation_context", "read_job")
		http.Error(w, "Failed to fetch job", http.StatusInternalServerError)
		return
	}

	resumePlaintext := userResume.Plaintext
	generateResumeContext.ResumePlaintext = resumePlaintext
	generateResumeContext.Job = job

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(generateResumeContext)

}
