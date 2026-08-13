package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	stripeService "github.com/CoreyPorter5/seek-sync/backend/internal/stripe"
	"github.com/jackc/pgx/v5"
)

//handles authenticated user billing actions

func CreateCheckoutSessionHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	sc := stripeService.NewStripeClient()
	checkoutSession, err := stripeService.CreateCheckoutSession(r.Context(), sc, userID)
	if err != nil {
		captureHandlerError(r, observability.CodeBillingAPIFailed, err, "billing", "create_checkout_session")
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

	userProfile, err := db.GetUserProfile(r.Context(), userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeProfileStoreFailed, err, "billing", "read_profile_for_portal")
		http.Error(w, "Failed to get user profile", http.StatusInternalServerError)
		return
	}

	stripeCustomerID := userProfile.StripeCustomerID

	if stripeCustomerID == nil || *stripeCustomerID == "" {
		http.Error(w, "No stripe customer found for user", http.StatusBadRequest)
		return
	}

	sc := stripeService.NewStripeClient()
	portalSession, err := stripeService.CreateCustomerPortalSession(r.Context(), sc, *stripeCustomerID)
	if err != nil {
		captureHandlerError(r, observability.CodeBillingAPIFailed, err, "billing", "create_customer_portal_session")
		http.Error(w, "Failed to create customer portal session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": portalSession.URL,
	})
}
