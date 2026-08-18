package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestProfileJSONOmitsInternalStripeIdentifiers(t *testing.T) {
	value := "internal-billing-identifier"
	payload, err := json.Marshal(Profile{
		StripeCustomerID:     &value,
		StripeSubscriptionID: &value,
		StripePaymentStatus:  &value,
	})
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}

	encoded := string(payload)
	for _, field := range []string{"stripe_customer_id", "stripe_subscription_id", "stripe_payment_status"} {
		if strings.Contains(encoded, field) {
			t.Fatalf("profile JSON exposed internal field %q: %s", field, encoded)
		}
	}
}
