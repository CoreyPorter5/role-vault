package db

import (
	"testing"
	"time"
)

func TestAdvanceFreeUsagePeriod(t *testing.T) {
	expiredEnd := time.Date(2026, time.January, 31, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		now           time.Time
		expectedStart time.Time
		expectedEnd   time.Time
	}{
		{
			name:          "exact boundary starts next period",
			now:           expiredEnd,
			expectedStart: expiredEnd,
			expectedEnd:   expiredEnd.Add(freeUsagePeriod),
		},
		{
			name:          "late request retains anchored period",
			now:           expiredEnd.Add(12 * time.Hour),
			expectedStart: expiredEnd,
			expectedEnd:   expiredEnd.Add(freeUsagePeriod),
		},
		{
			name:          "multiple missed periods advance to current window",
			now:           expiredEnd.Add(65 * 24 * time.Hour),
			expectedStart: expiredEnd.Add(60 * 24 * time.Hour),
			expectedEnd:   expiredEnd.Add(90 * 24 * time.Hour),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			start, end := advanceFreeUsagePeriod(expiredEnd, test.now)
			if !start.Equal(test.expectedStart) {
				t.Fatalf("start = %s, want %s", start, test.expectedStart)
			}
			if !end.Equal(test.expectedEnd) {
				t.Fatalf("end = %s, want %s", end, test.expectedEnd)
			}
		})
	}
}

func TestDocumentCreditWalletCombinesPromotionalAndPurchasedBalances(t *testing.T) {
	wallet := documentCreditWallet{Promotional: 6, Purchased: 100}
	if wallet.balance() != 106 {
		t.Fatalf("wallet balance = %d, want 106", wallet.balance())
	}

	empty := documentCreditWallet{}
	if empty.balance() != 0 {
		t.Fatalf("empty wallet balance = %d, want 0", empty.balance())
	}
}
