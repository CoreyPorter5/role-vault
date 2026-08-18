package auth_middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestBearerToken(t *testing.T) {
	tests := []struct {
		name   string
		header string
		want   string
		ok     bool
	}{
		{name: "standard", header: "Bearer token", want: "token", ok: true},
		{name: "case insensitive scheme", header: "bearer token", want: "token", ok: true},
		{name: "surrounding whitespace", header: "  Bearer   token  ", want: "token", ok: true},
		{name: "missing", header: ""},
		{name: "wrong scheme", header: "Basic token"},
		{name: "missing token", header: "Bearer"},
		{name: "extra value", header: "Bearer token extra"},
		{name: "text before scheme", header: "prefixBearer token"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, ok := bearerToken(test.header)
			if ok != test.ok || got != test.want {
				t.Fatalf("bearerToken(%q) = (%q, %v), want (%q, %v)", test.header, got, ok, test.want, test.ok)
			}
		})
	}
}

func TestRequireAuthValidatesJWTAndPublishesSubject(t *testing.T) {
	privateKey := mustRSAKey(t)
	wrongKey := mustRSAKey(t)
	const keyID = "test-key"
	var jwksRequests atomic.Int32

	jwksServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		jwksRequests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{rsaJWK(&privateKey.PublicKey, keyID)},
		})
	}))
	defer jwksServer.Close()

	t.Setenv("SUPABASE_URL", jwksServer.URL)
	resetJWKSForTest(t)
	issuer := jwksServer.URL + "/auth/v1"

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(UserIDKey).(string)
		if !ok || userID != "user-123" {
			t.Fatalf("authenticated subject = %q, want user-123", userID)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	handler := RequireAuth(next)

	valid := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	expired := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(-time.Hour).Unix(),
	})
	missingSubject := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	badSignature := signedToken(t, wrongKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	wrongIssuer := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  "https://different-project.supabase.co/auth/v1",
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	wrongAudience := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  "anon",
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	wrongRole := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": "service_role",
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	missingExpiration := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
	})
	disallowedAlgorithm := signedTokenWithMethod(t, jwt.SigningMethodPS256, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})

	tests := []struct {
		name       string
		header     string
		wantStatus int
	}{
		{name: "valid token", header: "Bearer " + valid, wantStatus: http.StatusNoContent},
		{name: "expired token", header: "Bearer " + expired, wantStatus: http.StatusUnauthorized},
		{name: "missing subject", header: "Bearer " + missingSubject, wantStatus: http.StatusUnauthorized},
		{name: "invalid signature", header: "Bearer " + badSignature, wantStatus: http.StatusUnauthorized},
		{name: "wrong issuer", header: "Bearer " + wrongIssuer, wantStatus: http.StatusUnauthorized},
		{name: "wrong audience", header: "Bearer " + wrongAudience, wantStatus: http.StatusUnauthorized},
		{name: "wrong role", header: "Bearer " + wrongRole, wantStatus: http.StatusUnauthorized},
		{name: "missing expiration", header: "Bearer " + missingExpiration, wantStatus: http.StatusUnauthorized},
		{name: "disallowed signing algorithm", header: "Bearer " + disallowedAlgorithm, wantStatus: http.StatusUnauthorized},
		{name: "malformed header", header: "prefixBearer " + valid, wantStatus: http.StatusUnauthorized},
		{name: "missing header", wantStatus: http.StatusUnauthorized},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/protected", nil)
			if test.header != "" {
				request.Header.Set("Authorization", test.header)
			}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", response.Code, test.wantStatus, response.Body.String())
			}
			if got := response.Header().Get("Cache-Control"); got != "private, no-store" {
				t.Fatalf("Cache-Control = %q, want private, no-store", got)
			}
		})
	}

	if got := jwksRequests.Load(); got != 1 {
		t.Fatalf("JWKS requests = %d, want 1", got)
	}
}

func TestRequireAuthRetriesJWKSInitializationAfterFailure(t *testing.T) {
	privateKey := mustRSAKey(t)
	const keyID = "retry-key"
	var jwksRequests atomic.Int32

	jwksServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if jwksRequests.Add(1) == 1 {
			http.Error(w, "temporarily unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{rsaJWK(&privateKey.PublicKey, keyID)},
		})
	}))
	defer jwksServer.Close()

	t.Setenv("SUPABASE_URL", jwksServer.URL)
	resetJWKSForTest(t)
	issuer := jwksServer.URL + "/auth/v1"
	handler := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	token := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})

	firstResponse := httptest.NewRecorder()
	firstRequest := httptest.NewRequest(http.MethodGet, "/protected", nil)
	firstRequest.Header.Set("Authorization", "Bearer "+token)
	handler.ServeHTTP(firstResponse, firstRequest)
	if firstResponse.Code != http.StatusInternalServerError {
		t.Fatalf("first status = %d, want %d", firstResponse.Code, http.StatusInternalServerError)
	}

	jwksMu.Lock()
	lastJWKSInitAttempt = time.Now().Add(-jwksInitRetryInterval)
	jwksMu.Unlock()

	secondResponse := httptest.NewRecorder()
	secondRequest := httptest.NewRequest(http.MethodGet, "/protected", nil)
	secondRequest.Header.Set("Authorization", "Bearer "+token)
	handler.ServeHTTP(secondResponse, secondRequest)
	if secondResponse.Code != http.StatusNoContent {
		t.Fatalf("second status = %d, want %d; body = %s", secondResponse.Code, http.StatusNoContent, secondResponse.Body.String())
	}
	if got := jwksRequests.Load(); got != 2 {
		t.Fatalf("JWKS requests = %d, want 2", got)
	}
}

func TestRequireAuthSynchronizesJWKSInitialization(t *testing.T) {
	privateKey := mustRSAKey(t)
	const keyID = "concurrent-key"
	var jwksRequests atomic.Int32

	jwksServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		jwksRequests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{rsaJWK(&privateKey.PublicKey, keyID)},
		})
	}))
	defer jwksServer.Close()

	t.Setenv("SUPABASE_URL", jwksServer.URL)
	resetJWKSForTest(t)
	issuer := jwksServer.URL + "/auth/v1"
	handler := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	token := signedToken(t, privateKey, keyID, jwt.MapClaims{
		"sub":  "user-123",
		"iss":  issuer,
		"aud":  authenticatedAudience,
		"role": authenticatedRole,
		"exp":  time.Now().Add(time.Hour).Unix(),
	})

	const concurrentRequests = 8
	start := make(chan struct{})
	statuses := make(chan int, concurrentRequests)
	var waitGroup sync.WaitGroup
	for range concurrentRequests {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			request := httptest.NewRequest(http.MethodGet, "/protected", nil)
			request.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			statuses <- response.Code
		}()
	}
	close(start)
	waitGroup.Wait()
	close(statuses)

	for status := range statuses {
		if status != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", status, http.StatusNoContent)
		}
	}
	if got := jwksRequests.Load(); got != 1 {
		t.Fatalf("JWKS requests = %d, want 1", got)
	}
}

func TestReserveJWKSCaptureRateLimits(t *testing.T) {
	var lastCapture atomic.Int64
	if !reserveJWKSCapture(&lastCapture) {
		t.Fatal("first capture was unexpectedly suppressed")
	}
	if reserveJWKSCapture(&lastCapture) {
		t.Fatal("second capture was not rate limited")
	}
}

func resetJWKSForTest(t *testing.T) {
	t.Helper()
	CloseJWKS()
	lastJWKSInitCapture.Store(0)
	lastJWKSRefreshCapture.Store(0)
	t.Cleanup(func() {
		CloseJWKS()
		lastJWKSInitCapture.Store(0)
		lastJWKSRefreshCapture.Store(0)
	})
}

func mustRSAKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate RSA key: %v", err)
	}
	return key
}

func rsaJWK(key *rsa.PublicKey, keyID string) map[string]string {
	exponent := big.NewInt(int64(key.E)).Bytes()
	return map[string]string{
		"kty": "RSA",
		"kid": keyID,
		"use": "sig",
		"alg": "RS256",
		"n":   base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
		"e":   base64.RawURLEncoding.EncodeToString(exponent),
	}
}

func signedToken(t *testing.T, key *rsa.PrivateKey, keyID string, claims jwt.MapClaims) string {
	t.Helper()
	return signedTokenWithMethod(t, jwt.SigningMethodRS256, key, keyID, claims)
}

func signedTokenWithMethod(t *testing.T, method jwt.SigningMethod, key *rsa.PrivateKey, keyID string, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(method, claims)
	token.Header["kid"] = keyID
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign JWT: %v", err)
	}
	return signed
}
