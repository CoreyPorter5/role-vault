package handlers

import "testing"

func TestCheckoutBlockedByExistingSubscription(t *testing.T) {
	subscriptionID := "sub_123"
	emptySubscriptionID := ""
	tests := []struct {
		name           string
		plan           string
		status         string
		subscriptionID *string
		blocked        bool
	}{
		{name: "pro plan without subscription metadata", plan: "pro", blocked: true},
		{name: "active", plan: "free", status: "active", subscriptionID: &subscriptionID, blocked: true},
		{name: "past due", plan: "free", status: "past_due", subscriptionID: &subscriptionID, blocked: true},
		{name: "incomplete", plan: "free", status: "incomplete", subscriptionID: &subscriptionID, blocked: true},
		{name: "canceled", plan: "free", status: "canceled", subscriptionID: &subscriptionID, blocked: false},
		{name: "incomplete expired", plan: "free", status: "incomplete_expired", subscriptionID: &subscriptionID, blocked: false},
		{name: "no subscription", plan: "free", status: "inactive", blocked: false},
		{name: "empty subscription", plan: "free", status: "active", subscriptionID: &emptySubscriptionID, blocked: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := checkoutBlockedByExistingSubscription(test.plan, test.status, test.subscriptionID); got != test.blocked {
				t.Fatalf("blocked = %v, want %v", got, test.blocked)
			}
		})
	}
}
