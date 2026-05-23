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
	DraftResume models.TailoredResume `json:"draft_resume"`
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

	success, err := db.AddGeneratedUserResumeDraft(userID, jobID, body.DraftResume) //Adds user job draft

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
