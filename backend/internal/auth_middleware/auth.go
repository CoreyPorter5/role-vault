package auth_middleware

import (
	"context"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

var (
	jwks *keyfunc.JWKS
	once sync.Once
)

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var jwksErr error
		once.Do(func() {
			supabaseURL := os.Getenv("SUPABASE_URL")
			jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"
			jwks, jwksErr = keyfunc.Get(jwksURL, keyfunc.Options{})
		})

		if jwksErr != nil || jwks == nil {
			http.Error(w, "Internal Server Error: Could not fetch public keys", http.StatusInternalServerError)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		splitToken := strings.Split(authHeader, "Bearer ")
		if len(splitToken) != 2 {
			http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}
		rawToken := strings.TrimSpace(splitToken[1])

		token, err := jwt.Parse(rawToken, jwks.Keyfunc)

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

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
