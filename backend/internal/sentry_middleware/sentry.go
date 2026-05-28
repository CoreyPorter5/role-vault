package sentry_middleware

import (
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
)

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hub := sentry.CurrentHub().Clone()
		hub.Scope().SetRequest(r)
		defer func() {
			if err := recover(); err != nil {
				hub.Recover(err)
				hub.Flush(2 * time.Second)
				panic(err)
			}
		}()
		next.ServeHTTP(w, r.WithContext(sentry.SetHubOnContext(r.Context(), hub)))
	})
}
