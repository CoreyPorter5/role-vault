package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type StripeEntitlementAction string

const (
	StripeActivatePreservingUsage StripeEntitlementAction = "activate_preserving_usage"
	StripeRenewAndResetUsage      StripeEntitlementAction = "renew_and_reset_usage"
	StripeDowngradeRecoverable    StripeEntitlementAction = "downgrade_recoverable"
	StripeDowngradeTerminal       StripeEntitlementAction = "downgrade_terminal"
)

type StripeEventRecord struct {
	ID        string
	Type      string
	ObjectID  string
	CreatedAt int64
	Priority  int16
}

type StripeSubscriptionUpdate struct {
	UserID             string
	CustomerID         string
	SubscriptionID     string
	SubscriptionStatus string
	PaymentStatus      string
	PeriodStart        time.Time
	PeriodEnd          time.Time
	Action             StripeEntitlementAction
}

func ApplyStripeSubscriptionEvent(
	ctx context.Context,
	event StripeEventRecord,
	update StripeSubscriptionUpdate,
) (bool, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	isNewEvent, err := recordStripeEvent(ctx, tx, event)
	if err != nil {
		return false, err
	}
	if !isNewEvent {
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}

	userID, err := resolveStripeProfileUserID(ctx, tx, update)
	if err != nil {
		return false, err
	}

	now := time.Now().UTC()
	profile, err := lockAndNormalizeQuotaProfile(ctx, tx, userID, now)
	if err != nil {
		return false, err
	}

	var lastCreatedAt int64
	var lastPriority int16
	if err := tx.QueryRow(
		ctx,
		`SELECT stripe_state_event_created_at, stripe_state_event_priority
		 FROM profiles
		 WHERE user_id = $1`,
		userID,
	).Scan(&lastCreatedAt, &lastPriority); err != nil {
		return false, err
	}

	if !stripeEventShouldApply(event.CreatedAt, event.Priority, lastCreatedAt, lastPriority) {
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}

	switch update.Action {
	case StripeActivatePreservingUsage:
		if err := validateStripePeriod(update.PeriodStart, update.PeriodEnd); err != nil {
			return false, err
		}
		profile.ResumeLimit = proResumeGenerationLimit
		profile.CoverLetterLimit = proCoverLetterGenerationLimit
		profile.PeriodStart = update.PeriodStart
		profile.PeriodEnd = update.PeriodEnd
	case StripeRenewAndResetUsage:
		if err := validateStripePeriod(update.PeriodStart, update.PeriodEnd); err != nil {
			return false, err
		}
		if profile.Plan != "pro" || update.PeriodStart.After(profile.PeriodStart) {
			profile.ResumeUsed = 0
			profile.CoverLetterUsed = 0
		}
		profile.ResumeLimit = proResumeGenerationLimit
		profile.CoverLetterLimit = proCoverLetterGenerationLimit
		profile.PeriodStart = update.PeriodStart
		profile.PeriodEnd = update.PeriodEnd
	case StripeDowngradeRecoverable, StripeDowngradeTerminal:
		if profile.Plan != "free" {
			profile.PeriodStart = now
			profile.PeriodEnd = now.Add(freeUsagePeriod)
		}
		profile.ResumeUsed = 0
		profile.ResumeLimit = freeResumeGenerationLimit
		profile.CoverLetterUsed = 0
		profile.CoverLetterLimit = freeCoverLetterGenerationLimit
	default:
		return false, fmt.Errorf("unsupported Stripe entitlement action %q", update.Action)
	}

	plan := "pro"
	stripeSubscriptionID := update.SubscriptionID
	stripePaymentStatus := update.PaymentStatus
	if update.Action == StripeDowngradeRecoverable || update.Action == StripeDowngradeTerminal {
		plan = "free"
	}
	if update.Action == StripeDowngradeTerminal {
		stripeSubscriptionID = ""
		stripePaymentStatus = ""
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE profiles
		 SET plan = $2,
		     subscription_status = $3,
		     stripe_customer_id = COALESCE(NULLIF($4, ''), stripe_customer_id),
		     stripe_subscription_id = NULLIF($5, ''),
		     stripe_payment_status = NULLIF($6, ''),
		     resume_generations_used = $7,
		     resume_generations_limit = $8,
		     cover_letter_generations_used = $9,
		     cover_letter_generations_limit = $10,
		     resume_usage_period_start = $11,
		     resume_usage_period_end = $12,
		     stripe_state_event_created_at = $13,
		     stripe_state_event_priority = $14,
		     stripe_last_event_id = $15,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		plan,
		update.SubscriptionStatus,
		update.CustomerID,
		stripeSubscriptionID,
		stripePaymentStatus,
		profile.ResumeUsed,
		profile.ResumeLimit,
		profile.CoverLetterUsed,
		profile.CoverLetterLimit,
		profile.PeriodStart,
		profile.PeriodEnd,
		event.CreatedAt,
		event.Priority,
		event.ID,
	)
	if err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func stripeEventShouldApply(eventCreatedAt int64, eventPriority int16, lastCreatedAt int64, lastPriority int16) bool {
	return eventCreatedAt > lastCreatedAt || (eventCreatedAt == lastCreatedAt && eventPriority >= lastPriority)
}

func recordStripeEvent(ctx context.Context, tx pgx.Tx, event StripeEventRecord) (bool, error) {
	var eventID string
	err := tx.QueryRow(
		ctx,
		`INSERT INTO stripe_webhook_events (
		   event_id,
		   event_type,
		   object_id,
		   event_created_at
		 ) VALUES ($1, $2, NULLIF($3, ''), $4)
		 ON CONFLICT (event_id) DO NOTHING
		 RETURNING event_id`,
		event.ID,
		event.Type,
		event.ObjectID,
		event.CreatedAt,
	).Scan(&eventID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func resolveStripeProfileUserID(ctx context.Context, tx pgx.Tx, update StripeSubscriptionUpdate) (string, error) {
	if update.UserID != "" {
		return update.UserID, nil
	}

	var userID string
	if update.SubscriptionID != "" {
		err := tx.QueryRow(
			ctx,
			`SELECT user_id FROM profiles WHERE stripe_subscription_id = $1`,
			update.SubscriptionID,
		).Scan(&userID)
		if err == nil {
			return userID, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
	}

	if update.CustomerID != "" {
		err := tx.QueryRow(
			ctx,
			`SELECT user_id FROM profiles WHERE stripe_customer_id = $1`,
			update.CustomerID,
		).Scan(&userID)
		if err == nil {
			return userID, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
	}

	return "", ErrProfileNotFound
}

func validateStripePeriod(start time.Time, end time.Time) error {
	if start.IsZero() || end.IsZero() || !end.After(start) {
		return fmt.Errorf("invalid Stripe subscription period")
	}
	return nil
}
