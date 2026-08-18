package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
)

func GetResumeGenerationUsageHandler(w http.ResponseWriter, r *http.Request) {
	getDocumentCreditUsage(w, r, db.GetResumeGenerationUsage)
}

func GetCoverLetterGenerationUsageHandler(w http.ResponseWriter, r *http.Request) {
	getDocumentCreditUsage(w, r, db.GetCoverLetterGenerationUsage)
}

func GetDocumentCreditUsageHandler(w http.ResponseWriter, r *http.Request) {
	getDocumentCreditUsage(w, r, db.GetDocumentCreditUsage)
}

func getDocumentCreditUsage(
	w http.ResponseWriter,
	r *http.Request,
	load func(context.Context, string) (models.DocumentCreditUsage, error),
) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	creditUsage, err := load(r.Context(), userID)
	if err != nil {
		if errors.Is(err, db.ErrProfileNotFound) {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeUsageStoreFailed, err, "usage", "read_document_credits")
		http.Error(w, "Failed to get document credit usage", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(creditUsage)

}
