package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
)

func GetResumeGenerationUsageHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	resumeGenerationUsage, err := db.GetResumeGenerationUsage(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to get resume generation usage for user %s: %v\n", userID, err)
		http.Error(w, "Failed to get resume usage", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resumeGenerationUsage)

}
