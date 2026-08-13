package auth_middleware

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"sync"

	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
)

const InternalAPIKeyHeader = "X-Seek-Sync-Internal-Key"

var captureInternalAPIConfigOnce sync.Once

func RequireInternalAPI(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expected := os.Getenv("INTERNAL_API_SECRET")
		if len(expected) < 32 {
			captureInternalAPIConfigOnce.Do(func() {
				observability.CaptureRequestError(r, observability.CodeInternalAPIConfigFailed, errors.New("internal API secret is missing or too short"), observability.Operation{
					Area:   "auth",
					Action: "validate_internal_api_config",
				})
			})
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
