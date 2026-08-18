package auth_middleware

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/MicahParks/keyfunc/v2"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

var (
	jwksMu                 sync.Mutex
	jwks                   *keyfunc.JWKS
	jwksErr                error
	lastJWKSInitAttempt    time.Time
	lastJWKSInitCapture    atomic.Int64
	lastJWKSRefreshCapture atomic.Int64
)

const (
	jwksInitRetryInterval = 30 * time.Second
	jwksCaptureInterval   = 5 * time.Minute
	authenticatedAudience = "authenticated"
	authenticatedRole     = "authenticated"
)

var allowedJWTSigningMethods = []string{
	jwt.SigningMethodES256.Alg(),
	jwt.SigningMethodRS256.Alg(),
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "private, no-store")

		rawToken, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			http.Error(w, "Invalid or missing Authorization header", http.StatusUnauthorized)
			return
		}

		keys, err, attempted := loadJWKS()
		if err != nil || keys == nil {
			if attempted {
				captureJWKSInitializationError(r, err)
			}
			http.Error(w, "Internal Server Error: Could not fetch public keys", http.StatusInternalServerError)
			return
		}

		token, err := jwt.Parse(
			rawToken,
			keys.Keyfunc,
			jwt.WithValidMethods(allowedJWTSigningMethods),
			jwt.WithIssuer(supabaseIssuer()),
			jwt.WithAudience(authenticatedAudience),
			jwt.WithExpirationRequired(),
		)

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "User ID not found in token", http.StatusUnauthorized)
			return
		}
		role, ok := claims["role"].(string)
		if !ok || role != authenticatedRole {
			http.Error(w, "Invalid token role", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func loadJWKS() (*keyfunc.JWKS, error, bool) {
	jwksMu.Lock()
	defer jwksMu.Unlock()

	if jwks != nil {
		return jwks, nil, false
	}

	now := time.Now()
	if jwksErr != nil && now.Before(lastJWKSInitAttempt.Add(jwksInitRetryInterval)) {
		return nil, jwksErr, false
	}
	lastJWKSInitAttempt = now

	supabaseURL := supabaseBaseURL()
	loadedJWKS, err := keyfunc.Get(supabaseURL+"/auth/v1/.well-known/jwks.json", keyfunc.Options{
		RefreshErrorHandler: captureJWKSRefreshError,
		RefreshInterval:     time.Hour,
		RefreshRateLimit:    5 * time.Minute,
		RefreshTimeout:      10 * time.Second,
		RefreshUnknownKID:   true,
	})
	if err == nil && loadedJWKS == nil {
		err = errors.New("JWKS client was not initialized")
	}
	if err != nil {
		jwksErr = err
		return nil, err, true
	}

	jwks = loadedJWKS
	jwksErr = nil
	return jwks, nil, true
}

func supabaseBaseURL() string {
	return strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
}

func supabaseIssuer() string {
	return supabaseBaseURL() + "/auth/v1"
}

func captureJWKSInitializationError(r *http.Request, err error) {
	if err == nil || !reserveJWKSCapture(&lastJWKSInitCapture) {
		return
	}
	observability.CaptureRequestError(r, observability.CodeAuthKeysFailed, err, observability.Operation{
		Area:   "auth",
		Action: "initialize_jwks",
	})
}

func captureJWKSRefreshError(err error) {
	if err == nil || !reserveJWKSCapture(&lastJWKSRefreshCapture) {
		return
	}
	observability.CaptureError(context.Background(), observability.CodeAuthKeysFailed, err, observability.Operation{
		Area:   "auth",
		Action: "refresh_jwks",
	})
}

func reserveJWKSCapture(lastCapture *atomic.Int64) bool {
	now := time.Now().UnixNano()
	for {
		previous := lastCapture.Load()
		if previous != 0 && time.Duration(now-previous) < jwksCaptureInterval {
			return false
		}
		if lastCapture.CompareAndSwap(previous, now) {
			return true
		}
	}
}

// CloseJWKS stops the background key refresh loop during graceful shutdown.
func CloseJWKS() {
	jwksMu.Lock()
	loadedJWKS := jwks
	jwks = nil
	jwksErr = nil
	lastJWKSInitAttempt = time.Time{}
	jwksMu.Unlock()

	if loadedJWKS != nil {
		loadedJWKS.EndBackground()
	}
}

func bearerToken(header string) (string, bool) {
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return "", false
	}
	return parts[1], true
}
