//Receives the POST request, calls the DB, returns JSON

package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func AddUserJob(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	fmt.Println(userID)

	var incomingJob models.Job                          //The expected structure of what the nextjs post request is sending
	err := json.NewDecoder(r.Body).Decode(&incomingJob) //Reads the post request in r.Body by decoding its JSON. It fills in the empty message struct with this decoded data by passing its reference in (so it doesnt duplicate the struct in memory)

	incomingJob.UserID = uuid.New().String()

	if err != nil {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
	prettyJSON, err := json.MarshalIndent(incomingJob, "", "  ")
	if err != nil {
		log.Fatalf("Failed to generate json: %v", err)
	}
	fmt.Println(string(prettyJSON))

	w.Header().Set("Content-Type", "application/json") //Sets the response content type to JSON which is what we are about to send back to nextjs
	w.WriteHeader(http.StatusCreated)                  //Sets the HTTP status code to 201 Created (typical for a successful POST request)
	json.NewEncoder(w).Encode(incomingJob)             //Encodes the message struct back to JSONand writes it to the response body so the client recieves it back. We can send anything such as "status":"ok" or anything back or nothing.
}

func GetUserJobs(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	fmt.Println(userID)
}
