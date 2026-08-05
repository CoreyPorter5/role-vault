package auth_middleware

import (
	"crypto/subtle"
	"net/http"
	"os"
)

const InternalAPIKeyHeader = "X-Seek-Sync-Internal-Key"

func RequireInternalAPI(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expected := os.Getenv("INTERNAL_API_SECRET")
		if len(expected) < 32 {
			http.Error(w, "Internal API authentication is not configured", http.StatusServiceUnavailable)
			return
		}

		provided := r.Header.Get(InternalAPIKeyHeader)
		if len(provided) != len(expected) || subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
