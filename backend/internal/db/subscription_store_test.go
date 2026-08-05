package db

import (
	"testing"
	"time"
)

func TestStripeEventShouldApply(t *testing.T) {
	tests := []struct {
		name     string
		created  int64
		priority int16
		last     int64
		lastPrio int16
		want     bool
	}{
		{name: "newer timestamp", created: 101, priority: 1, last: 100, lastPrio: 50, want: true},
		{name: "older timestamp", created: 99, priority: 50, last: 100, lastPrio: 1, want: false},
		{name: "higher same-second priority", created: 100, priority: 40, last: 100, lastPrio: 30, want: true},
		{name: "same event tier is idempotently applicable", created: 100, priority: 30, last: 100, lastPrio: 30, want: true},
		{name: "lower same-second priority", created: 100, priority: 20, last: 100, lastPrio: 30, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := stripeEventShouldApply(test.created, test.priority, test.last, test.lastPrio); got != test.want {
				t.Fatalf("stripeEventShouldApply() = %v, want %v", got, test.want)
			}
		})
	}
}

func TestValidateStripePeriod(t *testing.T) {
	start := time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC)
	if err := validateStripePeriod(start, start.Add(30*24*time.Hour)); err != nil {
		t.Fatalf("valid period rejected: %v", err)
	}
	if err := validateStripePeriod(start, start); err == nil {
		t.Fatal("equal period boundaries should be rejected")
	}
}
