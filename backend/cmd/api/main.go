//Starts the server & connects to the DB

package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/handlers"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/CoreyPorter5/seek-sync/backend/internal/sentry_middleware"
	"github.com/getsentry/sentry-go"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"
)

func main() {
	if err := run(); err != nil {
		log.Printf("fatal: %v", err)
		os.Exit(1)
	}
}

func run() error {
	godotenv.Load()
	appEnvironment := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	dsn := strings.TrimSpace(os.Getenv("SENTRY_DSN"))
	productionEnvironment := appEnvironment == "production" || appEnvironment == "staging"
	if productionEnvironment && dsn == "" {
		log.Printf("warning: Sentry error reporting is disabled because SENTRY_DSN is not configured for %s", appEnvironment)
	}
	if dsn != "" && !productionEnvironment {
		log.Printf("Sentry error reporting is disabled for APP_ENV=%q", appEnvironment)
	}
	if dsn != "" && productionEnvironment {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              dsn,
			Environment:      appEnvironment,
			Release:          os.Getenv("APP_VERSION"),
			AttachStacktrace: true,
			SendDefaultPII:   false,
			SampleRate:       1.0,
			TracesSampleRate: 0.0,
			BeforeSend:       observability.ScrubEvent,
		})
		if err != nil {
			log.Printf("sentry.Init error: %v", err)
		}
		defer sentry.Flush(2 * time.Second)
	}

	if err := db.InitDB(); err != nil {
		observability.CaptureError(context.Background(), observability.CodeStartupDatabaseFailed, err, observability.Operation{
			Area:   "startup",
			Action: "connect_database",
		})
		return fmt.Errorf("database initialization failed: %w", err)
	}
	defer db.Conn.Close()
	defer auth_middleware.CloseJWKS()

	r := chi.NewRouter() //r can recieve incoming HTTP requests and dispath them to handlers
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(sentry_middleware.Middleware)

	r.Use(cors.Handler(cors.Options{
		// Allow Seek's website and your future Chrome Extension UI
		AllowedOrigins:   []string{"https://au.seek.com", os.Getenv("FRONTEND_URL")},
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
				r.Get("/{jobID}/resume-category", handlers.GetJobResumeCategoryHandler)
				r.Patch("/{jobID}/resume-category", handlers.SetJobResumeCategoryHandler)

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

			r.Route("/cover-letter-generation-context", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/{jobID}", handlers.GetCoverLetterGenerationContext)
			})

			r.Route("/profile", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.Get("/", handlers.GetUserProfile)
			})

			r.Route("/generated-resumes", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)

				r.Get("/{jobID}", handlers.GetGeneratedUserResume)
				r.Post("/{jobID}", handlers.AddGeneratedUserResume)
				r.Delete("/{jobID}", handlers.DeleteGeneratedUserResume)
			})

			r.Route("/generated-resume-drafts", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/", handlers.GetGeneratedUserResumeDrafts)
				r.Post("/jobs/{jobID}", handlers.AddGeneratedUserResumeDraft)
				r.Delete("/jobs/{jobID}", handlers.DeleteGeneratedUserResumeDraft)
				r.Get("/{draftID}", handlers.GetGeneratedUserResumeDraft)

			})

			r.Route("/generated-cover-letters", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/{jobID}", handlers.GetGeneratedCoverLetter)
				r.Post("/{jobID}", handlers.SaveGeneratedCoverLetter)
				r.Delete("/{jobID}", handlers.DeleteGeneratedCoverLetter)
			})

			r.Route("/generated-cover-letter-drafts", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/jobs/{jobID}", handlers.GetGeneratedCoverLetterDraft)
				r.Delete("/jobs/{jobID}", handlers.DeleteGeneratedCoverLetterDraft)
			})

			r.Route("/resume-library", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/", handlers.GetResumeLibraryItems)
			})

			r.Route("/usage", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.Get("/resume-generations", handlers.GetResumeGenerationUsageHandler)
				r.Get("/cover-letter-generations", handlers.GetCoverLetterGenerationUsageHandler)
			})

			r.Route("/internal/resume-generations", func(r chi.Router) {
				r.Use(auth_middleware.RequireInternalAPI)
				r.Use(auth_middleware.RequireAuth)

				r.With(httprate.LimitByIP(10, time.Minute)).Post("/reserve", handlers.ReserveResumeGenerationHandler)
				r.Post("/{generationID}/complete", handlers.CompleteResumeGenerationHandler)
				r.Post("/{generationID}/fail", handlers.RefundResumeGenerationHandler)
			})

			r.Route("/internal/cover-letter-generations", func(r chi.Router) {
				r.Use(auth_middleware.RequireInternalAPI)
				r.Use(auth_middleware.RequireAuth)

				r.With(httprate.LimitByIP(10, time.Minute)).Post("/reserve", handlers.ReserveCoverLetterGenerationHandler)
				r.Post("/{generationID}/complete", handlers.CompleteCoverLetterGenerationHandler)
				r.Post("/{generationID}/fail", handlers.RefundCoverLetterGenerationHandler)
			})

			r.Route("/internal/job-resume-categories", func(r chi.Router) {
				r.Use(auth_middleware.RequireInternalAPI)
				r.Use(auth_middleware.RequireAuth)

				r.With(httprate.LimitByIP(10, time.Minute)).Post("/{jobID}/claim", handlers.ClaimJobResumeCategoryHandler)
				r.Post("/{jobID}/complete", handlers.CompleteJobResumeCategoryHandler)
				r.Post("/{jobID}/fail", handlers.FailJobResumeCategoryHandler)
			})

			r.Route("/billing", func(r chi.Router) {
				r.Use(auth_middleware.RequireAuth)
				r.With(httprate.LimitByIP(5, time.Minute)).Post("/create-checkout-session", handlers.CreateCheckoutSessionHandler)
				r.With(httprate.LimitByIP(5, time.Minute)).Post("/create-portal-session", handlers.CreateCustomerPortalSessionHandler)
			})

		})

	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}
	shutdownSignal, stopSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignals()

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			captureHTTPServerError(err, "serve_http")
			return fmt.Errorf("HTTP server failed: %w", err)
		}
	case <-shutdownSignal.Done():
		shutdownContext, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
		var shutdownErr error
		if err := server.Shutdown(shutdownContext); err != nil {
			captureHTTPServerError(err, "shutdown_http")
			shutdownErr = fmt.Errorf("HTTP server shutdown failed: %w", err)
			_ = server.Close()
		}
		cancelShutdown()
		if err := <-serverErrors; err != nil && !errors.Is(err, http.ErrServerClosed) {
			captureHTTPServerError(err, "serve_http")
			shutdownErr = errors.Join(shutdownErr, fmt.Errorf("HTTP server failed during shutdown: %w", err))
		}
		return shutdownErr
	}

	return nil
}

func captureHTTPServerError(err error, action string) {
	observability.CaptureError(context.Background(), observability.CodeHTTPServerFailed, err, observability.Operation{
		Area:   "runtime",
		Action: action,
	})
}
