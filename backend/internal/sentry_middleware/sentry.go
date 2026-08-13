package sentry_middleware

import (
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/getsentry/sentry-go"
)

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hub := sentry.CurrentHub().Clone()
		request := r.WithContext(sentry.SetHubOnContext(r.Context(), hub))
		defer func() {
			if recovered := recover(); recovered != nil {
				observability.CapturePanic(request, recovered)
				panic(recovered)
			}
		}()
		next.ServeHTTP(w, request)
	})
}
