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

func AddUserResume(w http.ResponseWriter, r *http.Request) {
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

	fmt.Println("Filename: ", fileHeader.Filename)

	w.Header().Set("Content-Type", "application/json") //Sets the response content type to JSON which is what we are about to send back to nextjs

	path, err := db.AddUserResume(userID, file, fileHeader) //Adds user job

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

func GetUserResume(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}
	fmt.Println("UserID: ", userID)
	userResume, err := db.GetUserResume(userID)

	if err != nil {
		http.Error(w, "Failed to fetch user resume", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userResume)

}

func UpdateUserResume(w http.ResponseWriter, r *http.Request) {
	return
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
