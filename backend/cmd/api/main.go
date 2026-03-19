//Starts the server & connects to the DB

package main

import (
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {

	r := chi.NewRouter() //r can recieve incoming HTTP requests and dispath them to handlers
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		// Allow Seek's website and your future Chrome Extension UI
		AllowedOrigins:   []string{"https://www.seek.com.au", "chrome-extension://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-User-Id"},
		AllowCredentials: true,
	}))

	r.Route("/api/v1", func(r chi.Router) {

		r.Route("/users/{userID}/jobs", func(r chi.Router) {
			r.Post("/", handlers.AddUserJob) //Same with a post request
			r.Get("/", handlers.GetUserJobs)
			r.Delete("/{jobID}", handlers.DeleteUserJob)
		})

	})

	err := http.ListenAndServe(":8080", r) //Starts a server on port 8080
	if err != nil {
		return
	}
}
