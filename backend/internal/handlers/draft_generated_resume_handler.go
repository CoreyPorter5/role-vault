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

type AddGeneratedUserResumeDraftRequest struct {
	DraftResume     models.TailoredResume `json:"draft_resume"`
	ResumeCategory  models.ResumeCategory `json:"resume_category"`
	ProfileVersion  int                   `json:"profile_version"`
	TemplateVersion string                `json:"template_version"`
}

func AddGeneratedUserResumeDraft(w http.ResponseWriter, r *http.Request) {
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

	var body AddGeneratedUserResumeDraftRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if !models.ValidResumeProfileSelection(body.ResumeCategory, body.ProfileVersion, body.TemplateVersion) {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_PROFILE", "resume category or profile version is not supported")
		return
	}

	success, err := db.AddGeneratedUserResumeDraft(
		userID,
		jobID,
		body.DraftResume,
		body.ResumeCategory,
		body.ProfileVersion,
		body.TemplateVersion,
	) //Adds user job draft

	if err != nil {
		fmt.Printf("Failed to save generated resume draft for user %s and job %s: %v\n", userID, jobID, err)
		http.Error(w, "Failed to save generated resume draft", http.StatusInternalServerError)
	}

	if !success {
		http.Error(w, "Generated resume draft was not saved", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) //Sets the HTTP status code to 201 Created (typical for a successful POST request)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Generated resume draft saved",
	})
}

func GetGeneratedUserResumeDrafts(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	userGeneratedResumeDrafts, err := db.GetGeneratedUserResumeDrafts(userID)
	if err != nil {
		http.Error(w, "Generated resume draft not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userGeneratedResumeDrafts)

}

func GetGeneratedUserResumeDraft(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	draftID := chi.URLParam(r, "draftID")
	if draftID == "" {
		http.Error(w, "draftID is required", http.StatusBadRequest)
		return
	}

	userGeneratedResumeDraft, err := db.GetGeneratedUserResumeDraft(userID, draftID)
	if err != nil {
		http.Error(w, "Generated resume JSON draft not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userGeneratedResumeDraft)

}

func DeleteGeneratedUserResumeDraft(w http.ResponseWriter, r *http.Request) {
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
	success, err := db.DeleteGeneratedUserResumeDraft(userID, jobID)
	if err != nil {
		http.Error(w, "Failed to delete draft resume not found", http.StatusInternalServerError)
		return
	}

	if !success {
		http.Error(w, "Draft not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)

}
