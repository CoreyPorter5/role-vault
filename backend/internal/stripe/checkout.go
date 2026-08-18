package stripe

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strings"
	"time"

	stripego "github.com/stripe/stripe-go/v85"
)

const checkoutIntegrationIdentifier = "seeksync_web_kjrxmpta"

type CheckoutSessionRequest struct {
	UserID             string
	Email              string
	CustomerID         string
	SubscriptionID     string
	SubscriptionStatus string
}

func CreateCheckoutSession(ctx context.Context, sc *stripego.Client, request CheckoutSessionRequest) (*stripego.CheckoutSession, error) {
	params, err := newCheckoutSessionParams(request)
	if err != nil {
		return nil, err
	}

	requestContext, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return sc.V1CheckoutSessions.Create(requestContext, params)
}

func newCheckoutSessionParams(request CheckoutSessionRequest) (*stripego.CheckoutSessionCreateParams, error) {
	userID := strings.TrimSpace(request.UserID)
	if userID == "" {
		return nil, errors.New("checkout user ID is required")
	}
	priceID := strings.TrimSpace(os.Getenv("STRIPE_PRO_PRICE_ID"))
	if priceID == "" {
		return nil, errors.New("Stripe Pro price is not configured")
	}
	frontendURL := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/")
	if frontendURL == "" {
		return nil, errors.New("frontend URL is not configured")
	}

	params := &stripego.CheckoutSessionCreateParams{
		Mode:                  stripego.String(stripego.CheckoutSessionModeSubscription),
		LineItems:             []*stripego.CheckoutSessionCreateLineItemParams{{Price: stripego.String(priceID), Quantity: stripego.Int64(1)}},
		SuccessURL:            stripego.String(frontendURL + "/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:             stripego.String(frontendURL + "/dashboard/upgrade?cancelled=true"),
		ClientReferenceID:     stripego.String(userID),
		IntegrationIdentifier: stripego.String(checkoutIntegrationIdentifier),
		Metadata:              map[string]string{"user_id": userID, "plan": "pro"},
		SubscriptionData: &stripego.CheckoutSessionCreateSubscriptionDataParams{
			Metadata: map[string]string{"user_id": userID, "plan": "pro"},
		},
	}
	if customerID := strings.TrimSpace(request.CustomerID); customerID != "" {
		params.Customer = stripego.String(customerID)
	} else if email := strings.TrimSpace(request.Email); email != "" {
		params.CustomerEmail = stripego.String(email)
	}
	params.SetIdempotencyKey(checkoutIdempotencyKey(request, priceID))
	return params, nil
}

func checkoutIdempotencyKey(request CheckoutSessionRequest, priceID string) string {
	state := strings.Join([]string{
		strings.TrimSpace(request.UserID),
		strings.TrimSpace(priceID),
		strings.TrimSpace(request.CustomerID),
		strings.TrimSpace(request.SubscriptionID),
		strings.ToLower(strings.TrimSpace(request.SubscriptionStatus)),
	}, "|")
	digest := sha256.Sum256([]byte(state))
	return "seeksync-checkout-v1-" + hex.EncodeToString(digest[:])
}
