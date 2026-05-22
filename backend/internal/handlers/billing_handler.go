package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	stripeService "github.com/CoreyPorter5/seek-sync/backend/internal/stripe"
)

//handles authenticated user billing actions

func CreateCheckoutSessionHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Print("Running session handler\n")
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	sc := stripeService.NewStripeClient()
	checkoutSession, err := stripeService.CreateCheckoutSession(sc, userID)
	if err != nil {
		http.Error(w, "Failed to create checkout session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": checkoutSession.URL,
	})
}

func CreateCustomerPortalSessionHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorised", http.StatusUnauthorized)
		return
	}

	userProfile, err := db.GetUserProfile(userID)

	if err != nil {
		http.Error(w, "Failed to get user profile", http.StatusInternalServerError)
		return
	}

	stripeCustomerID := userProfile.StripeCustomerID

	if stripeCustomerID == nil || *stripeCustomerID == "" {
		http.Error(w, "No stripe customer found for user", http.StatusBadRequest)
		return
	}

	sc := stripeService.NewStripeClient()
	portalSession, err := stripeService.CreateCustomerPortalSession(sc, *stripeCustomerID)
	if err != nil {
		http.Error(w, "Failed to create customer portal session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": portalSession.URL,
	})
}
