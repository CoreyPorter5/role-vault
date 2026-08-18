package auth_middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/httprate"
)

func LimitByUserID(requestLimit int, windowLength time.Duration) func(http.Handler) http.Handler {
	return httprate.Limit(
		requestLimit,
		windowLength,
		httprate.WithKeyFuncs(rateLimitKeyByUserID),
	)
}

func rateLimitKeyByUserID(r *http.Request) (string, error) {
	userID, ok := r.Context().Value(UserIDKey).(string)
	userID = strings.TrimSpace(userID)
	if !ok || userID == "" {
		return "", errors.New("authenticated user ID is unavailable for rate limiting")
	}
	return userID, nil
}
