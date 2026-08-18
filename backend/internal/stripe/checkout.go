package stripe

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	stripego "github.com/stripe/stripe-go/v86"
)

const (
	checkoutIntegrationIdentifier = "seeksync_web_kjrxmpta"
	CreditPack100                 = "credits_100"
	CreditPack250                 = "credits_250"
)

type CreditPack struct {
	Code        string
	Credits     int
	AmountTotal int64
	Currency    string
	PriceID     string
}

type CheckoutSessionRequest struct {
	UserID     string
	Email      string
	CustomerID string
	PackCode   string
	PurchaseID string
}

func IsCreditPackCode(code string) bool {
	switch strings.TrimSpace(code) {
	case CreditPack100, CreditPack250:
		return true
	default:
		return false
	}
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

func CreditPackForCode(code string) (CreditPack, error) {
	switch strings.TrimSpace(code) {
	case CreditPack100:
		return configuredCreditPack(CreditPack100, 100, 999, "STRIPE_DOCUMENT_CREDITS_100_PRICE_ID")
	case CreditPack250:
		return configuredCreditPack(CreditPack250, 250, 1999, "STRIPE_DOCUMENT_CREDITS_250_PRICE_ID")
	default:
		return CreditPack{}, fmt.Errorf("unsupported document credit pack %q", code)
	}
}

func configuredCreditPack(code string, credits int, amountTotal int64, priceEnvironmentKey string) (CreditPack, error) {
	priceID := strings.TrimSpace(os.Getenv(priceEnvironmentKey))
	if priceID == "" {
		return CreditPack{}, fmt.Errorf("Stripe price for %s is not configured", code)
	}
	return CreditPack{
		Code:        code,
		Credits:     credits,
		AmountTotal: amountTotal,
		Currency:    "aud",
		PriceID:     priceID,
	}, nil
}

func newCheckoutSessionParams(request CheckoutSessionRequest) (*stripego.CheckoutSessionCreateParams, error) {
	userID := strings.TrimSpace(request.UserID)
	if userID == "" {
		return nil, errors.New("checkout user ID is required")
	}
	purchaseID := strings.TrimSpace(request.PurchaseID)
	if _, err := uuid.Parse(purchaseID); err != nil {
		return nil, errors.New("checkout purchase ID must be a UUID")
	}
	pack, err := CreditPackForCode(request.PackCode)
	if err != nil {
		return nil, err
	}
	frontendURL := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/")
	if frontendURL == "" {
		return nil, errors.New("frontend URL is not configured")
	}

	metadata := map[string]string{
		"user_id":       userID,
		"purchase_type": "document_credits",
		"purchase_id":   purchaseID,
		"pack_code":     pack.Code,
		"credits":       strconv.Itoa(pack.Credits),
	}
	params := &stripego.CheckoutSessionCreateParams{
		Mode:                  stripego.String(stripego.CheckoutSessionModePayment),
		LineItems:             []*stripego.CheckoutSessionCreateLineItemParams{{Price: stripego.String(pack.PriceID), Quantity: stripego.Int64(1)}},
		SuccessURL:            stripego.String(frontendURL + "/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:             stripego.String(frontendURL + "/dashboard/upgrade?cancelled=true"),
		ClientReferenceID:     stripego.String(userID),
		IntegrationIdentifier: stripego.String(checkoutIntegrationIdentifier),
		Metadata:              metadata,
		PaymentIntentData: &stripego.CheckoutSessionCreatePaymentIntentDataParams{
			Metadata: metadata,
		},
	}
	if customerID := strings.TrimSpace(request.CustomerID); customerID != "" {
		params.Customer = stripego.String(customerID)
	} else {
		params.CustomerCreation = stripego.String(string(stripego.CheckoutSessionCustomerCreationAlways))
		if email := strings.TrimSpace(request.Email); email != "" {
			params.CustomerEmail = stripego.String(email)
		}
	}
	params.SetIdempotencyKey(checkoutIdempotencyKey(request))
	return params, nil
}

func checkoutIdempotencyKey(request CheckoutSessionRequest) string {
	state := strings.Join([]string{
		strings.TrimSpace(request.UserID),
		strings.TrimSpace(request.PurchaseID),
	}, "|")
	digest := sha256.Sum256([]byte(state))
	return "seeksync-credit-checkout-v1-" + hex.EncodeToString(digest[:])
}
