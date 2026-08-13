package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
)

func GetResumeGenerationUsageHandler(w http.ResponseWriter, r *http.Request) {
	getGenerationUsage(w, r, "resume", db.GetResumeGenerationUsage)
}

func GetCoverLetterGenerationUsageHandler(w http.ResponseWriter, r *http.Request) {
	getGenerationUsage(w, r, "cover letter", db.GetCoverLetterGenerationUsage)
}

func getGenerationUsage(
	w http.ResponseWriter,
	r *http.Request,
	documentType string,
	load func(context.Context, string) (models.ResumeGenerationUsage, error),
) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	generationUsage, err := load(r.Context(), userID)
	if err != nil {
		if errors.Is(err, db.ErrProfileNotFound) {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeUsageStoreFailed, err, "usage", "read_"+strings.ReplaceAll(documentType, " ", "_")+"_generation_usage")
		http.Error(w, "Failed to get "+documentType+" usage", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(generationUsage)

}
