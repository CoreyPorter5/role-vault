//Starts the server & connects to the DB

package main

import (
	"log"
	"net/http"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
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
		AllowedOrigins:   []string{"https://au.seek.com", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/stripe", func(r chi.Router) {
			r.Post("/webhook", handlers.StripeWebhookHandler)
		})

		r.Group(func(r chi.Router) {
			r.Use(httprate.LimitByIP(100, time.Minute))

			r.Route("/jobs", func(r chi.Router) {

				r.Use(auth_middleware.RequireAuth)

				r.With(httprate.LimitByIP(20, time.Minute)).Post("/", handlers.AddUserJob)
				r.Get("/", handlers.GetUserJobs)
				r.Delete("/{jobID}", handlers.DeleteUserJob)
				r.Patch("/{jobID}", handlers.UpdateJobStatus)

			})

			r.Route("/resume", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.With(httprate.LimitByIP(10, time.Minute)).Post("/", handlers.AddUserResume)
				r.With(httprate.LimitByIP(10, time.Minute)).Patch("/", handlers.UpdateUserResume)

				r.Get("/", handlers.GetUserResume)
				r.Delete("/", handlers.DeleteUserResume)

			})

			r.Route("/resume-generation-context", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.Get("/{jobID}", handlers.GetGenerationContext)
			})

			r.Route("/profile", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.Get("/", handlers.GetUserProfile)
			})

			r.Route("/generated-resumes", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.Get("/{jobID}/download", handlers.GetGeneratedUserResume)
				r.Post("/{jobID}/upload", handlers.AddGeneratedUserResume)
				r.Delete("/{jobID}/delete", handlers.DeleteGeneratedUserResume)
			})

			r.Route("/generated-resume-drafts", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/", handlers.GetGeneratedUserResumeDrafts)
				r.Post("/{jobID}/upload", handlers.AddGeneratedUserResumeDraft)
				r.Delete("/{jobID}", handlers.DeleteGeneratedUserResumeDraft)
				r.Get("/{draftID}", handlers.GetGeneratedUserResumeDraft)

			})

			r.Route("/resume-library", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/", handlers.GetResumeLibraryItems)
			})

			r.Route("/usage", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/resume-generations", handlers.GetResumeGenerationUsageHandler)
				r.With(httprate.LimitByIP(5, time.Minute)).Post("/resume-generations/consume", handlers.IncrementResumeGenerationsUsedHandler)
			})

			r.Route("/billing", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.With(httprate.LimitByIP(5, time.Minute)).Post("/create-checkout-session", handlers.CreateCheckoutSessionHandler)
				r.With(httprate.LimitByIP(5, time.Minute)).Post("/create-portal-session", handlers.CreateCustomerPortalSessionHandler)
			})

		})

	})

	err := http.ListenAndServe(":8080", r) //Starts a server on port 8080
	if err != nil {
		log.Fatal(http.ListenAndServe(":8080", r))
	}

}
