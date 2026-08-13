package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
)

func GetResumeLibraryItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	userGeneratedResumes, err := db.GetResumeLibraryItems(r.Context(), userID)

	if err != nil {
		captureHandlerError(r, observability.CodeResumeLibraryStoreFailed, err, "resume_library", "list")
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userGeneratedResumes)

}
