package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	stripego "github.com/stripe/stripe-go/v85"
)

func TestStripeSubscriptionPeriodSelectsConfiguredPrice(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	subscription := &stripego.Subscription{
		Items: &stripego.SubscriptionItemList{Data: []*stripego.SubscriptionItem{
			{Price: &stripego.Price{ID: "price_other"}, CurrentPeriodStart: 1_700_000_000, CurrentPeriodEnd: 1_702_592_000},
			{Price: &stripego.Price{ID: "price_pro"}, CurrentPeriodStart: 1_800_000_000, CurrentPeriodEnd: 1_802_592_000},
		}},
	}

	start, end, err := stripeSubscriptionPeriod(subscription)
	if err != nil {
		t.Fatalf("stripeSubscriptionPeriod() error: %v", err)
	}
	if !start.Equal(time.Unix(1_800_000_000, 0).UTC()) || !end.Equal(time.Unix(1_802_592_000, 0).UTC()) {
		t.Fatalf("unexpected period %s - %s", start, end)
	}
}

func TestStripeSubscriptionPeriodRejectsAmbiguousItems(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_missing")
	subscription := &stripego.Subscription{
		Items: &stripego.SubscriptionItemList{Data: []*stripego.SubscriptionItem{
			{Price: &stripego.Price{ID: "price_one"}, CurrentPeriodStart: 1, CurrentPeriodEnd: 2},
			{Price: &stripego.Price{ID: "price_two"}, CurrentPeriodStart: 1, CurrentPeriodEnd: 2},
		}},
	}
	if _, _, err := stripeSubscriptionPeriod(subscription); err == nil {
		t.Fatal("ambiguous subscription items should be rejected")
	}
}

func TestStripeSubscriptionPeriodRejectsSingleWrongPriceAndMissingConfiguration(t *testing.T) {
	subscription := &stripego.Subscription{
		Items: &stripego.SubscriptionItemList{Data: []*stripego.SubscriptionItem{
			{Price: &stripego.Price{ID: "price_other"}, CurrentPeriodStart: 1, CurrentPeriodEnd: 2},
		}},
	}
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	if _, _, err := stripeSubscriptionPeriod(subscription); err == nil {
		t.Fatal("a single non-Pro price should be rejected")
	}
	t.Setenv("STRIPE_PRO_PRICE_ID", "")
	if _, _, err := stripeSubscriptionPeriod(subscription); err == nil {
		t.Fatal("missing Pro price configuration should be rejected")
	}
}

func TestPaidInvoiceEntitlementRequiresActiveProSubscription(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	newSubscription := func(status stripego.SubscriptionStatus) *stripego.Subscription {
		return &stripego.Subscription{
			Status: status,
			Items: &stripego.SubscriptionItemList{Data: []*stripego.SubscriptionItem{
				{Price: &stripego.Price{ID: "price_pro"}, CurrentPeriodStart: 1_800_000_000, CurrentPeriodEnd: 1_802_592_000},
			}},
		}
	}

	for _, status := range []stripego.SubscriptionStatus{
		stripego.SubscriptionStatusCanceled,
		stripego.SubscriptionStatusIncompleteExpired,
		stripego.SubscriptionStatusIncomplete,
		stripego.SubscriptionStatusPastDue,
		stripego.SubscriptionStatusPaused,
		stripego.SubscriptionStatusUnpaid,
	} {
		t.Run(string(status), func(t *testing.T) {
			action, start, end, err := paidInvoiceEntitlement(
				newSubscription(status),
				stripego.InvoiceBillingReasonSubscriptionCycle,
			)
			if err != nil {
				t.Fatalf("paidInvoiceEntitlement returned error: %v", err)
			}
			if action != "downgrade_recoverable" && action != "downgrade_terminal" {
				t.Fatalf("inactive status %q received activating action %q", status, action)
			}
			if !start.IsZero() || !end.IsZero() {
				t.Fatalf("inactive status %q received a Pro billing period", status)
			}
		})
	}

	action, start, end, err := paidInvoiceEntitlement(
		newSubscription(stripego.SubscriptionStatusActive),
		stripego.InvoiceBillingReasonSubscriptionCycle,
	)
	if err != nil {
		t.Fatalf("active subscription was rejected: %v", err)
	}
	if action != "renew_and_reset_usage" || start.IsZero() || end.IsZero() {
		t.Fatalf("active renewal = %q, %s - %s", action, start, end)
	}
}

func TestPaidInvoiceEntitlementRejectsWrongPrice(t *testing.T) {
	t.Setenv("STRIPE_PRO_PRICE_ID", "price_pro")
	subscription := &stripego.Subscription{
		Status: stripego.SubscriptionStatusActive,
		Items: &stripego.SubscriptionItemList{Data: []*stripego.SubscriptionItem{
			{Price: &stripego.Price{ID: "price_other"}, CurrentPeriodStart: 1, CurrentPeriodEnd: 2},
		}},
	}
	if _, _, _, err := paidInvoiceEntitlement(subscription, stripego.InvoiceBillingReasonSubscriptionCycle); err == nil {
		t.Fatal("paid invoice for a non-Pro price was accepted")
	}
}

func TestInvoiceSubscriptionID(t *testing.T) {
	invoice := &stripego.Invoice{Parent: &stripego.InvoiceParent{
		SubscriptionDetails: &stripego.InvoiceParentSubscriptionDetails{
			Subscription: &stripego.Subscription{ID: "sub_123"},
		},
	}}
	got, err := invoiceSubscriptionID(invoice)
	if err != nil || got != "sub_123" {
		t.Fatalf("invoiceSubscriptionID() = %q, %v", got, err)
	}
	if _, err := invoiceSubscriptionID(&stripego.Invoice{}); err == nil {
		t.Fatal("invoice without subscription should be rejected")
	}
}

func TestStripeWebhookRejectsMissingConfigurationAndInvalidSignature(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/stripe/webhook", strings.NewReader(`{}`))
	response := httptest.NewRecorder()
	t.Setenv("STRIPE_WEBHOOK_SECRET_KEY", "")
	StripeWebhookHandler(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("missing secret status = %d", response.Code)
	}

	request = httptest.NewRequest(http.MethodPost, "/api/v1/stripe/webhook", strings.NewReader(`{}`))
	request.Header.Set("Stripe-Signature", "invalid")
	response = httptest.NewRecorder()
	t.Setenv("STRIPE_WEBHOOK_SECRET_KEY", "whsec_test")
	StripeWebhookHandler(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("invalid signature status = %d", response.Code)
	}
}
