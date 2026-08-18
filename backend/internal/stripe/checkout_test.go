package stripe

import (
	"strings"
	"testing"

	stripego "github.com/stripe/stripe-go/v86"
)

const testPurchaseID = "550e8400-e29b-41d4-a716-446655440000"

func configureTestCreditPacks(t *testing.T) {
	t.Helper()
	t.Setenv("STRIPE_DOCUMENT_CREDITS_100_PRICE_ID", "price_credits_100")
	t.Setenv("STRIPE_DOCUMENT_CREDITS_250_PRICE_ID", "price_credits_250")
}

func TestNewCheckoutSessionParamsCreatesOneTimeCreditPurchase(t *testing.T) {
	configureTestCreditPacks(t)
	t.Setenv("FRONTEND_URL", "https://app.example.com/")
	request := CheckoutSessionRequest{
		UserID:     "user-123",
		Email:      "user@example.com",
		CustomerID: "cus_123",
		PackCode:   CreditPack100,
		PurchaseID: testPurchaseID,
	}

	first, err := newCheckoutSessionParams(request)
	if err != nil {
		t.Fatalf("newCheckoutSessionParams returned error: %v", err)
	}
	second, err := newCheckoutSessionParams(request)
	if err != nil {
		t.Fatalf("second newCheckoutSessionParams returned error: %v", err)
	}
	if first.Mode == nil || *first.Mode != string(stripego.CheckoutSessionModePayment) {
		t.Fatalf("checkout mode = %v, want payment", first.Mode)
	}
	if len(first.LineItems) != 1 || first.LineItems[0].Price == nil || *first.LineItems[0].Price != "price_credits_100" {
		t.Fatalf("unexpected line item: %#v", first.LineItems)
	}
	if first.Customer == nil || *first.Customer != "cus_123" {
		t.Fatalf("customer = %v, want cus_123", first.Customer)
	}
	if first.CustomerEmail != nil || first.CustomerCreation != nil {
		t.Fatal("new-customer fields were sent with an existing customer")
	}
	if first.IdempotencyKey == nil || second.IdempotencyKey == nil || *first.IdempotencyKey != *second.IdempotencyKey {
		t.Fatal("identical purchase request did not produce a stable idempotency key")
	}
	if !strings.HasPrefix(*first.IdempotencyKey, "seeksync-credit-checkout-v1-") {
		t.Fatalf("unexpected idempotency key %q", *first.IdempotencyKey)
	}
	if first.IntegrationIdentifier == nil || *first.IntegrationIdentifier != checkoutIntegrationIdentifier {
		t.Fatalf("integration identifier = %v", first.IntegrationIdentifier)
	}
	if got := first.Metadata["pack_code"]; got != CreditPack100 {
		t.Fatalf("pack metadata = %q", got)
	}
	if got := first.Metadata["credits"]; got != "100" {
		t.Fatalf("credits metadata = %q", got)
	}
	if first.PaymentIntentData == nil || first.PaymentIntentData.Metadata["purchase_id"] != testPurchaseID {
		t.Fatal("payment intent purchase metadata was not set")
	}
	if got := *first.SuccessURL; got != "https://app.example.com/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}" {
		t.Fatalf("success URL = %q", got)
	}
}

func TestNewCheckoutSessionParamsCreatesCustomerForEmail(t *testing.T) {
	configureTestCreditPacks(t)
	t.Setenv("FRONTEND_URL", "http://localhost:3000")
	params, err := newCheckoutSessionParams(CheckoutSessionRequest{
		UserID:     "user-123",
		Email:      "user@example.com",
		PackCode:   CreditPack250,
		PurchaseID: testPurchaseID,
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
	if params.CustomerCreation == nil || *params.CustomerCreation != "always" {
		t.Fatalf("customer creation = %v, want always", params.CustomerCreation)
	}
}

func TestNewCheckoutSessionParamsRequiresTrustedPackAndConfiguration(t *testing.T) {
	configureTestCreditPacks(t)
	t.Setenv("FRONTEND_URL", "http://localhost:3000")
	valid := CheckoutSessionRequest{UserID: "user-123", PackCode: CreditPack100, PurchaseID: testPurchaseID}

	invalid := valid
	invalid.PackCode = "credits_1000"
	if _, err := newCheckoutSessionParams(invalid); err == nil {
		t.Fatal("unsupported Stripe pack was accepted")
	}
	invalid = valid
	invalid.PurchaseID = "not-a-uuid"
	if _, err := newCheckoutSessionParams(invalid); err == nil {
		t.Fatal("invalid purchase ID was accepted")
	}
	t.Setenv("STRIPE_DOCUMENT_CREDITS_100_PRICE_ID", "")
	if _, err := newCheckoutSessionParams(valid); err == nil {
		t.Fatal("missing Stripe price was accepted")
	}
	t.Setenv("STRIPE_DOCUMENT_CREDITS_100_PRICE_ID", "price_credits_100")
	t.Setenv("FRONTEND_URL", "")
	if _, err := newCheckoutSessionParams(valid); err == nil {
		t.Fatal("missing frontend URL was accepted")
	}
}

func TestCheckoutIdempotencyKeyChangesPerPurchase(t *testing.T) {
	base := CheckoutSessionRequest{UserID: "user-123", PackCode: CreditPack100, PurchaseID: testPurchaseID}
	first := checkoutIdempotencyKey(base)
	base.PackCode = CreditPack250
	if changedPack := checkoutIdempotencyKey(base); first != changedPack {
		t.Fatal("one purchase ID produced different idempotency keys across packs")
	}
	base.PurchaseID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
	second := checkoutIdempotencyKey(base)
	if first == second {
		t.Fatal("different purchases shared an idempotency key")
	}
}
