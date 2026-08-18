package stripe

import (
	"strings"
	"testing"
)

func TestNewCheckoutSessionParamsReusesCustomerAndSetsStableIdempotency(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	t.Setenv("FRONTEND_URL", "https://app.example.com/")
	request := CheckoutSessionRequest{
		UserID:             "user-123",
		Email:              "user@example.com",
		CustomerID:         "cus_123",
		SubscriptionStatus: "canceled",
	}

	first, err := newCheckoutSessionParams(request)
	if err != nil {
		t.Fatalf("newCheckoutSessionParams returned error: %v", err)
	}
	second, err := newCheckoutSessionParams(request)
	if err != nil {
		t.Fatalf("second newCheckoutSessionParams returned error: %v", err)
	}
	if first.Customer == nil || *first.Customer != "cus_123" {
		t.Fatalf("customer = %v, want cus_123", first.Customer)
	}
	if first.CustomerEmail != nil {
		t.Fatalf("customer email was sent with an existing customer: %q", *first.CustomerEmail)
	}
	if first.IdempotencyKey == nil || second.IdempotencyKey == nil || *first.IdempotencyKey != *second.IdempotencyKey {
		t.Fatal("identical checkout state did not produce a stable idempotency key")
	}
	if !strings.HasPrefix(*first.IdempotencyKey, "seeksync-checkout-v1-") {
		t.Fatalf("unexpected idempotency key %q", *first.IdempotencyKey)
	}
	if first.IntegrationIdentifier == nil || *first.IntegrationIdentifier != checkoutIntegrationIdentifier {
		t.Fatalf("integration identifier = %v", first.IntegrationIdentifier)
	}
	if got := *first.SuccessURL; got != "https://app.example.com/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}" {
		t.Fatalf("success URL = %q", got)
	}
}

func TestNewCheckoutSessionParamsPrefillsEmailForNewCustomer(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	t.Setenv("FRONTEND_URL", "http://localhost:3000")
	params, err := newCheckoutSessionParams(CheckoutSessionRequest{
		UserID: "user-123",
		Email:  "user@example.com",
	})
	if err != nil {
		t.Fatalf("newCheckoutSessionParams returned error: %v", err)
	}
	if params.Customer != nil {
		t.Fatalf("unexpected customer %q", *params.Customer)
	}
	if params.CustomerEmail == nil || *params.CustomerEmail != "user@example.com" {
		t.Fatalf("customer email = %v, want user@example.com", params.CustomerEmail)
	}
}

func TestNewCheckoutSessionParamsRequiresConfiguration(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "")
	t.Setenv("FRONTEND_URL", "http://localhost:3000")
	if _, err := newCheckoutSessionParams(CheckoutSessionRequest{UserID: "user-123"}); err == nil {
		t.Fatal("missing Stripe price was accepted")
	}

	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	t.Setenv("FRONTEND_URL", "")
	if _, err := newCheckoutSessionParams(CheckoutSessionRequest{UserID: "user-123"}); err == nil {
		t.Fatal("missing frontend URL was accepted")
	}
}

func TestCheckoutIdempotencyKeyChangesWithSubscriptionState(t *testing.T) {
	base := CheckoutSessionRequest{UserID: "user-123", CustomerID: "cus_123"}
	first := checkoutIdempotencyKey(base, "price_pro")
	base.SubscriptionID = "sub_123"
	base.SubscriptionStatus = "canceled"
	second := checkoutIdempotencyKey(base, "price_pro")
	if first == second {
		t.Fatal("different subscription states shared an idempotency key")
	}
}
