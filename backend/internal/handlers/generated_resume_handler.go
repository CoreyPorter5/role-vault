package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/go-chi/chi/v5"
)

func AddGeneratedUserResume(w http.ResponseWriter, r *http.Request) {
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

	prepared, err := resumeupload.PrepareDOCX(file, fileHeader, false)
	if err != nil {
		writeResumeUploadError(w, err)
		return
	}
	defer prepared.Cleanup()

	resumeJSONStr := r.FormValue("resumeJson")
	if resumeJSONStr == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_JSON", "Resume JSON not found")
		return
	}

	var resume models.TailoredResume
	if err := json.Unmarshal([]byte(resumeJSONStr), &resume); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_JSON", "Invalid resume JSON")
		return
	}

	jobID := chi.URLParam(r, "jobID")
	if jobID == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_JOB_ID", "jobID is required")
		return
	}

	path, err := db.AddGeneratedUserResume(r.Context(), userID, jobID, resume, prepared)
	if err != nil {
		if errors.Is(err, db.ErrGenerationJobNotFound) {
			writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
			return
		}
		fmt.Printf("Failed to save generated resume for user %s and job %s: %v\n", userID, jobID, err)
		writeJSONError(w, http.StatusInternalServerError, "RESUME_STORE_ERROR", "Failed to save generated resume")
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(path)
}
func GetGeneratedUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	jobID := chi.URLParam(r, "jobID")
	if jobID == "" {
		http.Error(w, "jobID is required", http.StatusBadRequest)
		return
	}

	signedURLResponse, err := db.GetGeneratedUserResume(userID, jobID)
	if err != nil {
		http.Error(w, "Generated resume not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(signedURLResponse)
}

func DeleteGeneratedUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	jobID := chi.URLParam(r, "jobID")
	if jobID == "" {
		http.Error(w, "jobID is required", http.StatusBadRequest)
		return
	}

	success, err := db.DeleteGeneratedUserResume(r.Context(), userID, jobID)
	if success {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		fmt.Printf("Failed to delete generated resume for user %s and job %s: %v\n", userID, jobID, err)
		http.Error(w, "Failed to delete generated resume", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "Generated resume not found", http.StatusNotFound)
		return
	}
}
