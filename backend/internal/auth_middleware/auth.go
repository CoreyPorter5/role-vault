package auth_middleware

import (
	"context"
	"fmt"

	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		jwtSecret := []byte(os.Getenv("SUPABASE_JWT_SECRET"))
		token, err := jwt.Parse(rawToken, func(token *jwt.Token) (interface{}, error) {
			// Ensure the token used the correct cryptographic algorithm
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// 7. Crack open the JSON payload and extract the user's UUID (the "sub" field)
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

		// 8. THE HANDOFF: Attach the UUID to the request's context
		ctx := context.WithValue(r.Context(), UserIDKey, userID)

		// 9. Open the door and pass the cloned request to your handlers (like AddUserJob)
		next.ServeHTTP(w, r.WithContext(ctx))

	})

}
