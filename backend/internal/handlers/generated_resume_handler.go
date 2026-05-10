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

func AddGeneratedUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)

	file, fileHeader, err := r.FormFile("resume") //The expected structure of what the nextjs post request is sending
	if err != nil {
		http.Error(w, "Resume file not found", http.StatusBadRequest)
		return
	}
	defer file.Close()

	resumeJSONStr := r.FormValue("resumeJson")
	if resumeJSONStr == "" {
		http.Error(w, "Resume JSON not found", http.StatusBadRequest)
		return
	}

	var resume models.TailoredResume
	if err := json.Unmarshal([]byte(resumeJSONStr), &resume); err != nil {
		http.Error(w, "Invalid resume JSON", http.StatusBadRequest)
		return
	}
	fmt.Println("Filename: ", fileHeader.Filename)

	w.Header().Set("Content-Type", "application/json") //Sets the response content type to JSON which is what we are about to send back to nextjs

	jobID := chi.URLParam(r, "jobID")
	if jobID == "" {
		http.Error(w, "jobID is required", http.StatusBadRequest)
		return
	}

	path, err := db.AddGeneratedUserResume(userID, jobID, resume, file, fileHeader) //Adds user job

	if err != nil {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		json.NewEncoder(w).Encode(map[string]string{
			"code":    "FILE_TOO_LARGE",
			"message": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated) //Sets the HTTP status code to 201 Created (typical for a successful POST request)
	json.NewEncoder(w).Encode(path)   //Encodes the message struct back to JSONand writes it to the response body so the client recieves it back. We can send anything such as "status":"ok" or anything back or nothing.
	return
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

	success, err := db.DeleteGeneratedUserResume(userID, jobID)
	if success {
		w.WriteHeader(http.StatusNoContent)
	} else if err != nil {
		http.Error(w, "Generated resume not found", http.StatusNotFound)
		return
	}

}
