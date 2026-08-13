//go:build integration

package db

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
)

type integrationSubscriptionProfile struct {
	Plan               string
	SubscriptionStatus string
	CustomerID         *string
	SubscriptionID     *string
	PaymentStatus      *string
	Used               int
	Limit              int
	CoverLetterUsed    int
	CoverLetterLimit   int
	PeriodStart        time.Time
	PeriodEnd          time.Time
	LastEventCreatedAt int64
	LastEventPriority  int16
	LastEventID        *string
}

func TestStripeSubscriptionLifecycleIntegration(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	userID := os.Getenv("STEP2_TEST_USER_ID")
	if databaseURL == "" || userID == "" {
		t.Skip("DATABASE_URL and STEP2_TEST_USER_ID are required")
	}

	InitDB()
	t.Cleanup(func() {
		Conn.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	eventPrefix := fmt.Sprintf("evt_step2_%d", time.Now().UnixNano())
	eventIDs := make([]string, 0, 10)
	newEvent := func(suffix string, createdAt int64, priority int16) StripeEventRecord {
		id := eventPrefix + "_" + suffix
		eventIDs = append(eventIDs, id)
		return StripeEventRecord{
			ID:        id,
			Type:      "step2.integration." + suffix,
			ObjectID:  "sub_step2",
			CreatedAt: createdAt,
			Priority:  priority,
		}
	}
	t.Cleanup(func() {
		cleanupContext, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		if _, err := Conn.Exec(cleanupContext, `DELETE FROM stripe_webhook_events WHERE event_id = ANY($1)`, eventIDs); err != nil {
			t.Errorf("clean up Stripe integration events: %v", err)
		}
	})

	now := time.Now().UTC().Truncate(time.Second)
	_, err := Conn.Exec(
		ctx,
		`UPDATE profiles
		 SET plan = 'free',
		     subscription_status = 'inactive',
		     stripe_customer_id = NULL,
		     stripe_subscription_id = NULL,
		     stripe_payment_status = NULL,
		     resume_generations_used = 2,
		     resume_generations_limit = 3,
		     cover_letter_generations_used = 1,
		     cover_letter_generations_limit = 3,
		     resume_usage_period_start = $2,
		     resume_usage_period_end = $3,
		     stripe_state_event_created_at = 0,
		     stripe_state_event_priority = 0,
		     stripe_last_event_id = NULL
		 WHERE user_id = $1`,
		userID,
		now,
		now.Add(30*24*time.Hour),
	)
	if err != nil {
		t.Fatalf("prepare disposable profile: %v", err)
	}

	periodOneStart := now.Add(24 * time.Hour)
	periodOneEnd := periodOneStart.Add(30 * 24 * time.Hour)
	baseUpdate := StripeSubscriptionUpdate{
		UserID:             userID,
		CustomerID:         "cus_step2",
		SubscriptionID:     "sub_step2",
		SubscriptionStatus: "active",
		PaymentStatus:      "paid",
		PeriodStart:        periodOneStart,
		PeriodEnd:          periodOneEnd,
		Action:             StripeActivatePreservingUsage,
	}

	upgrade := newEvent("upgrade", 100, 10)
	assertStripeApplied(t, ctx, upgrade, baseUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "pro" || profile.Used != 2 || profile.Limit != 100 || profile.CoverLetterUsed != 1 || profile.CoverLetterLimit != 100 {
			t.Fatalf("upgrade did not preserve usage at 2/100: %+v", profile)
		}
		if !profile.PeriodStart.Equal(periodOneStart) || !profile.PeriodEnd.Equal(periodOneEnd) {
			t.Fatalf("upgrade did not adopt the Stripe period: %+v", profile)
		}
	})

	assertStripeApplied(t, ctx, upgrade, baseUpdate, false)

	olderFailure := newEvent("older_failure", 99, 30)
	failureUpdate := baseUpdate
	failureUpdate.SubscriptionStatus = "past_due"
	failureUpdate.PaymentStatus = "failed"
	failureUpdate.PeriodStart = time.Time{}
	failureUpdate.PeriodEnd = time.Time{}
	failureUpdate.Action = StripeDowngradeRecoverable
	assertStripeApplied(t, ctx, olderFailure, failureUpdate, false)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "pro" || profile.Used != 2 {
			t.Fatalf("an older failure overwrote current Pro state: %+v", profile)
		}
	})

	scheduledCancellation := newEvent("scheduled_cancellation", 101, 20)
	assertStripeApplied(t, ctx, scheduledCancellation, baseUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "pro" || profile.Used != 2 || profile.SubscriptionStatus != "active" {
			t.Fatalf("scheduled cancellation removed access before period end: %+v", profile)
		}
	})

	paymentFailure := newEvent("payment_failure", 102, 30)
	assertStripeApplied(t, ctx, paymentFailure, failureUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "free" || profile.Used != 0 || profile.Limit != 3 || profile.CoverLetterUsed != 0 || profile.CoverLetterLimit != 3 {
			t.Fatalf("payment failure did not immediately downgrade to 0/3: %+v", profile)
		}
		if profile.SubscriptionID == nil || *profile.SubscriptionID != "sub_step2" {
			t.Fatalf("recoverable downgrade discarded subscription identity: %+v", profile)
		}
		if profile.PeriodEnd.Sub(profile.PeriodStart) != 30*24*time.Hour {
			t.Fatalf("recoverable downgrade did not start an exact 30-day free period: %+v", profile)
		}
	})

	stalePaid := newEvent("stale_paid", 101, 40)
	assertStripeApplied(t, ctx, stalePaid, baseUpdate, false)

	paid := newEvent("paid", 103, 40)
	assertStripeApplied(t, ctx, paid, baseUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "pro" || profile.Used != 0 || profile.Limit != 100 || profile.PaymentStatus == nil || *profile.PaymentStatus != "paid" {
			t.Fatalf("later payment did not restore Pro access: %+v", profile)
		}
	})

	if _, err := Conn.Exec(ctx, `UPDATE profiles SET resume_generations_used = 5, cover_letter_generations_used = 4 WHERE user_id = $1`, userID); err != nil {
		t.Fatalf("prepare renewal usage: %v", err)
	}
	periodTwoStart := periodOneEnd
	periodTwoEnd := periodTwoStart.Add(30 * 24 * time.Hour)
	renewalUpdate := baseUpdate
	renewalUpdate.PeriodStart = periodTwoStart
	renewalUpdate.PeriodEnd = periodTwoEnd
	renewalUpdate.Action = StripeRenewAndResetUsage
	renewal := newEvent("renewal", 104, 40)
	assertStripeApplied(t, ctx, renewal, renewalUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "pro" || profile.Used != 0 || profile.CoverLetterUsed != 0 || !profile.PeriodStart.Equal(periodTwoStart) {
			t.Fatalf("new billing period did not reset Pro usage: %+v", profile)
		}
	})

	if _, err := Conn.Exec(ctx, `UPDATE profiles SET resume_generations_used = 4, cover_letter_generations_used = 3 WHERE user_id = $1`, userID); err != nil {
		t.Fatalf("prepare repeated renewal usage: %v", err)
	}
	repeatedRenewal := newEvent("repeated_renewal", 105, 40)
	assertStripeApplied(t, ctx, repeatedRenewal, renewalUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Used != 4 || profile.CoverLetterUsed != 3 {
			t.Fatalf("a second event for the same billing period reset usage again: %+v", profile)
		}
	})

	terminalUpdate := failureUpdate
	terminalUpdate.SubscriptionStatus = "canceled"
	terminalUpdate.PaymentStatus = ""
	terminalUpdate.Action = StripeDowngradeTerminal
	deleted := newEvent("deleted", 106, 50)
	assertStripeApplied(t, ctx, deleted, terminalUpdate, true)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "free" || profile.Used != 0 || profile.Limit != 3 || profile.SubscriptionID != nil || profile.PaymentStatus != nil {
			t.Fatalf("terminal cancellation did not cleanly downgrade: %+v", profile)
		}
		if profile.CustomerID == nil || *profile.CustomerID != "cus_step2" {
			t.Fatalf("terminal cancellation discarded the Stripe customer identity: %+v", profile)
		}
	})

	sameSecondPaid := newEvent("same_second_paid", 106, 40)
	assertStripeApplied(t, ctx, sameSecondPaid, baseUpdate, false)
	assertIntegrationProfile(t, ctx, userID, func(profile integrationSubscriptionProfile) {
		if profile.Plan != "free" || profile.LastEventPriority != 50 || profile.LastEventID == nil || *profile.LastEventID != deleted.ID {
			t.Fatalf("lower-priority same-second event overwrote terminal cancellation: %+v", profile)
		}
	})
}

func assertStripeApplied(
	t *testing.T,
	ctx context.Context,
	event StripeEventRecord,
	update StripeSubscriptionUpdate,
	want bool,
) {
	t.Helper()
	applied, err := ApplyStripeSubscriptionEvent(ctx, event, update)
	if err != nil {
		t.Fatalf("apply Stripe event %s: %v", event.ID, err)
	}
	if applied != want {
		t.Fatalf("apply Stripe event %s = %v, want %v", event.ID, applied, want)
	}
}

func assertIntegrationProfile(
	t *testing.T,
	ctx context.Context,
	userID string,
	assert func(integrationSubscriptionProfile),
) {
	t.Helper()
	var profile integrationSubscriptionProfile
	err := Conn.QueryRow(
		ctx,
		`SELECT plan,
		        subscription_status,
		        stripe_customer_id,
		        stripe_subscription_id,
		        stripe_payment_status,
		        resume_generations_used,
		        resume_generations_limit,
		        cover_letter_generations_used,
		        cover_letter_generations_limit,
		        resume_usage_period_start,
		        resume_usage_period_end,
		        stripe_state_event_created_at,
		        stripe_state_event_priority,
		        stripe_last_event_id
		 FROM profiles
		 WHERE user_id = $1`,
		userID,
	).Scan(
		&profile.Plan,
		&profile.SubscriptionStatus,
		&profile.CustomerID,
		&profile.SubscriptionID,
		&profile.PaymentStatus,
		&profile.Used,
		&profile.Limit,
		&profile.CoverLetterUsed,
		&profile.CoverLetterLimit,
		&profile.PeriodStart,
		&profile.PeriodEnd,
		&profile.LastEventCreatedAt,
		&profile.LastEventPriority,
		&profile.LastEventID,
	)
	if err != nil {
		t.Fatalf("read disposable subscription profile: %v", err)
	}
	assert(profile)
}
