package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	stripeService "github.com/CoreyPorter5/seek-sync/backend/internal/stripe"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

//handles authenticated user billing actions

func CreateCheckoutSessionHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	checkoutRequest, err := decodeCreditCheckoutRequest(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userProfile, err := db.GetUserProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}
		captureHandlerError(r, observability.CodeProfileStoreFailed, err, "billing", "read_profile_for_checkout")
		http.Error(w, "Failed to get user profile", http.StatusInternalServerError)
		return
	}
	customerID := ""
	if userProfile.StripeCustomerID != nil {
		customerID = *userProfile.StripeCustomerID
	}
	sc := stripeService.NewStripeClient()
	checkoutSession, err := stripeService.CreateCheckoutSession(r.Context(), sc, stripeService.CheckoutSessionRequest{
		UserID:     userID,
		Email:      userProfile.Email,
		CustomerID: customerID,
		PackCode:   checkoutRequest.PackCode,
		PurchaseID: checkoutRequest.PurchaseID,
	})
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

type creditCheckoutRequest struct {
	PackCode   string `json:"pack_code"`
	PurchaseID string `json:"purchase_id"`
}

func decodeCreditCheckoutRequest(w http.ResponseWriter, r *http.Request) (creditCheckoutRequest, error) {
	const maxCheckoutBodyBytes = int64(4096)
	r.Body = http.MaxBytesReader(w, r.Body, maxCheckoutBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var request creditCheckoutRequest
	if err := decoder.Decode(&request); err != nil {
		return creditCheckoutRequest{}, errors.New("Invalid credit pack request")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return creditCheckoutRequest{}, errors.New("Invalid credit pack request")
	}
	if !stripeService.IsCreditPackCode(request.PackCode) {
		return creditCheckoutRequest{}, errors.New("Invalid credit pack")
	}
	if _, err := uuid.Parse(request.PurchaseID); err != nil {
		return creditCheckoutRequest{}, errors.New("Invalid purchase ID")
	}
	return request, nil
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
