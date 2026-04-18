package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
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
