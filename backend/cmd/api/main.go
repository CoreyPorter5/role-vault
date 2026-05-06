//Starts the server & connects to the DB

package main

import (
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	db.InitDB()
	defer db.Conn.Close()

	r := chi.NewRouter() //r can recieve incoming HTTP requests and dispath them to handlers
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		// Allow Seek's website and your future Chrome Extension UI
		AllowedOrigins:   []string{"https://www.seek.com.au", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Route("/api/v1/jobs", func(r chi.Router) {

		r.Use(auth_middleware.RequireAuth)

		r.Post("/", handlers.AddUserJob) //Same with a post request
		r.Get("/", handlers.GetUserJobs)
		r.Delete("/{jobID}", handlers.DeleteUserJob)
		r.Patch("/{jobID}", handlers.UpdateJobStatus)

	})

	r.Route("/api/v1/resume", func(r chi.Router) {
		r.Use(auth_middleware.RequireAuth)

		r.Post("/", handlers.AddUserResume)
		r.Get("/", handlers.GetUserResume)
		r.Delete("/", handlers.DeleteUserResume)
		r.Patch("/", handlers.UpdateUserResume)
	})

	r.Route("/api/v1/resume-generation-context", func(r chi.Router) {
		r.Use(auth_middleware.RequireAuth)

		r.Get("/{jobID}", handlers.GetGenerationContext)
	})

	r.Route("/api/v1/generated-resumes", func(r chi.Router) {
		r.Use(auth_middleware.RequireAuth)

		r.Post("/{jobID}", handlers.AddGeneratedUserResume)
	})

	err := http.ListenAndServe(":8080", r) //Starts a server on port 8080
	if err != nil {
		return
	}

}
