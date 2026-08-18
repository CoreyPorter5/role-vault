package db

import "testing"

func TestStripeCreditRefundTarget(t *testing.T) {
	tests := []struct {
		name       string
		credits    int
		total      int64
		refunded   int64
		wantTarget int
	}{
		{name: "full starter refund", credits: 100, total: 999, refunded: 999, wantTarget: 100},
		{name: "over refund clamps", credits: 100, total: 999, refunded: 1200, wantTarget: 100},
		{name: "partial refund is proportional", credits: 250, total: 1999, refunded: 1000, wantTarget: 125},
		{name: "tiny refund rounds down", credits: 100, total: 999, refunded: 1, wantTarget: 0},
		{name: "invalid amount", credits: 100, total: 0, refunded: 1, wantTarget: 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := stripeCreditRefundTarget(test.credits, test.total, test.refunded); got != test.wantTarget {
				t.Fatalf("stripeCreditRefundTarget() = %d, want %d", got, test.wantTarget)
			}
		})
	}
}

func TestValidateStripeCreditPurchase(t *testing.T) {
	valid := StripeCreditPurchase{
		UserID:            "user-123",
		PurchaseID:        "550e8400-e29b-41d4-a716-446655440000",
		CheckoutSessionID: "cs_test_123",
		PaymentIntentID:   "pi_123",
		PackCode:          "credits_100",
		Credits:           100,
		AmountTotal:       999,
		Currency:          "aud",
	}
	if err := validateStripeCreditPurchase(valid); err != nil {
		t.Fatalf("valid purchase was rejected: %v", err)
	}
	invalid := valid
	invalid.Credits = 0
	if err := validateStripeCreditPurchase(invalid); err == nil {
		t.Fatal("zero-credit purchase was accepted")
	}
}
