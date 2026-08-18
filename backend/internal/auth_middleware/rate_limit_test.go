package auth_middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimitByUserIDIsolatesUsersBehindTheSameIP(t *testing.T) {
	limiter := LimitByUserID(1, time.Minute)
	handler := limiter(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	request := func(userID string) int {
		r := httptest.NewRequest(http.MethodGet, "/protected", nil)
		r.RemoteAddr = "203.0.113.10:1234"
		r = r.WithContext(context.WithValue(r.Context(), UserIDKey, userID))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}

	if got := request("user-a"); got != http.StatusNoContent {
		t.Fatalf("first user-a status = %d, want %d", got, http.StatusNoContent)
	}
	if got := request("user-a"); got != http.StatusTooManyRequests {
		t.Fatalf("second user-a status = %d, want %d", got, http.StatusTooManyRequests)
	}
	if got := request("user-b"); got != http.StatusNoContent {
		t.Fatalf("first user-b status = %d, want %d", got, http.StatusNoContent)
	}
}

func TestRateLimitKeyByUserIDFailsClosedWithoutAuthenticatedUser(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if _, err := rateLimitKeyByUserID(request); err == nil {
		t.Fatal("missing authenticated user produced a rate-limit key")
	}
}
