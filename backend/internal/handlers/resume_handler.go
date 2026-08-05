package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

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
		writeResumeUploadError(w, err)
		return
	}
	defer prepared.Cleanup()

	path, err := db.AddUserResume(r.Context(), userID, prepared)
	if err != nil {
		fmt.Printf("Failed to save master resume for user %s: %v\n", userID, err)
		writeJSONError(w, http.StatusInternalServerError, "RESUME_STORE_ERROR", "Failed to save resume")
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(path)
}

func GetUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)
	userResume, err := db.GetUserResume(userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Resume not found", http.StatusNotFound)
			return
		}
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

	if err := json.NewDecoder(r.Body).Decode(&plaintextReq); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(plaintextReq.Plaintext) == "" {
		http.Error(w, "Plaintext resume cannot be empty", http.StatusBadRequest)
		return
	}
	fmt.Println("UserID: ", userID)
	success, err := db.UpdateUserResume(userID, plaintextReq.Plaintext)
	if err != nil {
		http.Error(w, "Failed to update master resume", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "Master resume not found", http.StatusNotFound)
		return
	}
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

	fmt.Println("UserID: ", userID)
	userResume, getResumeError := db.GetUserResume(userID)
	if getResumeError != nil {
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	job, getJobErr := db.GetUserJob(userID, jobID)
	if getJobErr != nil {
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	resumePlaintext := userResume.Plaintext
	generateResumeContext.ResumePlaintext = resumePlaintext
	generateResumeContext.Job = job

	fmt.Printf("SUCCESS GETTING CONTEXT\n")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(generateResumeContext)

}
