package auth_middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireInternalAPI(t *testing.T) {
	const secret = "0123456789abcdef0123456789abcdef"

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	tests := []struct {
		name           string
		configured     string
		provided       string
		expectedStatus int
	}{
		{name: "missing configuration", configured: "", provided: secret, expectedStatus: http.StatusServiceUnavailable},
		{name: "short configuration", configured: "too-short", provided: "too-short", expectedStatus: http.StatusServiceUnavailable},
		{name: "missing header", configured: secret, provided: "", expectedStatus: http.StatusUnauthorized},
		{name: "wrong header", configured: secret, provided: "0123456789abcdef0123456789abcdeg", expectedStatus: http.StatusUnauthorized},
		{name: "valid header", configured: secret, provided: secret, expectedStatus: http.StatusNoContent},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv("INTERNAL_API_SECRET", test.configured)
			request := httptest.NewRequest(http.MethodPost, "/internal", nil)
			if test.provided != "" {
				request.Header.Set(InternalAPIKeyHeader, test.provided)
			}
			response := httptest.NewRecorder()
			RequireInternalAPI(next).ServeHTTP(response, request)
			if response.Code != test.expectedStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.expectedStatus)
			}
		})
	}
}
