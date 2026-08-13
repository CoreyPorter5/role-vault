package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	stripeService "github.com/CoreyPorter5/seek-sync/backend/internal/stripe"
	stripego "github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/webhook"
)

const (
	stripePriorityCheckout            int16 = 10
	stripePrioritySubscriptionUpdated int16 = 20
	stripePriorityPaymentFailed       int16 = 30
	stripePriorityInvoicePaid         int16 = 40
	stripePrioritySubscriptionDeleted int16 = 50
)

var captureStripeWebhookConfigOnce sync.Once

// StripeWebhookHandler handles unauthenticated, signature-verified Stripe events.
func StripeWebhookHandler(w http.ResponseWriter, r *http.Request) {
	const maxBodyBytes = int64(65536)

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "Stripe webhook payload is too large", http.StatusRequestEntityTooLarge)
			return
		}
		captureHandlerError(r, observability.CodeStripeWebhookProcessFailed, err, "stripe_webhook", "read_body")
		http.Error(w, "Error reading request body", http.StatusServiceUnavailable)
		return
	}

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET_KEY")
	if endpointSecret == "" {
		captureStripeWebhookConfigOnce.Do(func() {
			captureHandlerError(r, observability.CodeStripeWebhookConfigFailed, errors.New("Stripe webhook secret is not configured"), "stripe_webhook", "validate_config")
		})
		http.Error(w, "Stripe webhook is not configured", http.StatusServiceUnavailable)
		return
	}

	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), endpointSecret)
	if err != nil {
		http.Error(w, "Invalid Stripe signature", http.StatusBadRequest)
		return
	}
	if event.ID == "" || event.Data == nil {
		captureHandlerError(r, observability.CodeStripeWebhookDecodeFailed, errors.New("signature-valid Stripe event was missing required fields"), "stripe_webhook", "validate_event")
		http.Error(w, "Invalid Stripe event", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case stripego.EventTypeCheckoutSessionCompleted:
		var session stripego.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleCheckoutSessionCompleted(r.Context(), event, session); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	case stripego.EventTypeCustomerSubscriptionUpdated:
		var subscription stripego.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleSubscriptionUpdated(r.Context(), event, subscription); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	case stripego.EventTypeCustomerSubscriptionDeleted:
		var subscription stripego.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleSubscriptionDeleted(r.Context(), event, subscription); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	case stripego.EventTypeInvoicePaymentFailed:
		var invoice stripego.Invoice
		if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleInvoicePaymentFailed(r.Context(), event, invoice); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	case stripego.EventTypeInvoicePaid, stripego.EventTypeInvoicePaymentSucceeded:
		var invoice stripego.Invoice
		if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleInvoicePaid(r.Context(), event, invoice); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	default:
		// Stripe can add event types independently. Unsupported, valid events are
		// intentionally acknowledged without creating production noise.
	}

	w.WriteHeader(http.StatusOK)
}

func handleCheckoutSessionCompleted(ctx context.Context, event stripego.Event, session stripego.CheckoutSession) error {
	userID := session.Metadata["user_id"]
	if userID == "" {
		userID = session.ClientReferenceID
	}
	if userID == "" {
		return fmt.Errorf("checkout session is missing user metadata")
	}
	if session.Customer == nil || session.Customer.ID == "" {
		return fmt.Errorf("checkout session is missing its customer")
	}
	if session.Subscription == nil || session.Subscription.ID == "" {
		return fmt.Errorf("checkout session is missing its subscription")
	}

	subscription, err := retrieveStripeSubscription(ctx, session.Subscription.ID)
	if err != nil {
		return err
	}
	periodStart, periodEnd, err := stripeSubscriptionPeriod(subscription)
	if err != nil {
		return err
	}

	action := db.StripeActivatePreservingUsage
	if (session.PaymentStatus != stripego.CheckoutSessionPaymentStatusPaid && session.PaymentStatus != stripego.CheckoutSessionPaymentStatusNoPaymentRequired) ||
		(subscription.Status != stripego.SubscriptionStatusActive && subscription.Status != stripego.SubscriptionStatusTrialing) {
		action = db.StripeDowngradeRecoverable
		periodStart = time.Time{}
		periodEnd = time.Time{}
	}

	_, err = db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, session.ID, stripePriorityCheckout), db.StripeSubscriptionUpdate{
		UserID:             userID,
		CustomerID:         session.Customer.ID,
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: string(subscription.Status),
		PaymentStatus:      string(session.PaymentStatus),
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		Action:             action,
	})
	return err
}

func handleSubscriptionUpdated(ctx context.Context, event stripego.Event, subscription stripego.Subscription) error {
	if subscription.ID == "" {
		return fmt.Errorf("subscription event is missing its subscription ID")
	}

	action := db.StripeDowngradeRecoverable
	periodStart, periodEnd := time.Time{}, time.Time{}
	var err error
	if subscription.Status == stripego.SubscriptionStatusActive || subscription.Status == stripego.SubscriptionStatusTrialing {
		action = db.StripeActivatePreservingUsage
		periodStart, periodEnd, err = stripeSubscriptionPeriod(&subscription)
		if err != nil {
			return err
		}
	} else if subscription.Status == stripego.SubscriptionStatusCanceled {
		action = db.StripeDowngradeTerminal
	}

	_, err = db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, subscription.ID, stripePrioritySubscriptionUpdated), db.StripeSubscriptionUpdate{
		UserID:             subscription.Metadata["user_id"],
		CustomerID:         stripeCustomerID(&subscription),
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: string(subscription.Status),
		PaymentStatus:      subscriptionPaymentStatus(subscription.Status),
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		Action:             action,
	})
	return err
}

func handleSubscriptionDeleted(ctx context.Context, event stripego.Event, subscription stripego.Subscription) error {
	if subscription.ID == "" {
		return fmt.Errorf("subscription event is missing its subscription ID")
	}

	_, err := db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, subscription.ID, stripePrioritySubscriptionDeleted), db.StripeSubscriptionUpdate{
		UserID:             subscription.Metadata["user_id"],
		CustomerID:         stripeCustomerID(&subscription),
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: "canceled",
		PaymentStatus:      "",
		Action:             db.StripeDowngradeTerminal,
	})
	return err
}

func handleInvoicePaymentFailed(ctx context.Context, event stripego.Event, invoice stripego.Invoice) error {
	subscriptionID, err := invoiceSubscriptionID(&invoice)
	if err != nil {
		return err
	}
	subscription, err := retrieveStripeSubscription(ctx, subscriptionID)
	if err != nil {
		return err
	}

	status := string(subscription.Status)
	if status == "" || status == string(stripego.SubscriptionStatusActive) {
		status = "past_due"
	}
	_, err = db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, invoice.ID, stripePriorityPaymentFailed), db.StripeSubscriptionUpdate{
		UserID:             subscription.Metadata["user_id"],
		CustomerID:         stripeCustomerID(subscription),
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: status,
		PaymentStatus:      "failed",
		Action:             db.StripeDowngradeRecoverable,
	})
	return err
}

func handleInvoicePaid(ctx context.Context, event stripego.Event, invoice stripego.Invoice) error {
	subscriptionID, err := invoiceSubscriptionID(&invoice)
	if err != nil {
		return err
	}
	subscription, err := retrieveStripeSubscription(ctx, subscriptionID)
	if err != nil {
		return err
	}
	periodStart, periodEnd, err := stripeSubscriptionPeriod(subscription)
	if err != nil {
		return err
	}

	action := db.StripeActivatePreservingUsage
	if invoice.BillingReason == stripego.InvoiceBillingReasonSubscriptionCycle {
		action = db.StripeRenewAndResetUsage
	}

	subscriptionStatus := string(subscription.Status)
	if subscription.Status != stripego.SubscriptionStatusActive && subscription.Status != stripego.SubscriptionStatusTrialing {
		subscriptionStatus = "active"
	}

	_, err = db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, invoice.ID, stripePriorityInvoicePaid), db.StripeSubscriptionUpdate{
		UserID:             subscription.Metadata["user_id"],
		CustomerID:         stripeCustomerID(subscription),
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: subscriptionStatus,
		PaymentStatus:      "paid",
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		Action:             action,
	})
	return err
}

func retrieveStripeSubscription(ctx context.Context, subscriptionID string) (*stripego.Subscription, error) {
	requestContext, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	subscription, err := stripeService.NewStripeClient().V1Subscriptions.Retrieve(requestContext, subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve Stripe subscription: %w", err)
	}
	return subscription, nil
}

func stripeSubscriptionPeriod(subscription *stripego.Subscription) (time.Time, time.Time, error) {
	if subscription == nil || subscription.Items == nil || len(subscription.Items.Data) == 0 {
		return time.Time{}, time.Time{}, fmt.Errorf("subscription is missing billing period items")
	}

	configuredPriceID := os.Getenv("STRIPE_PRO_PRICE_ID")
	var selected *stripego.SubscriptionItem
	for _, item := range subscription.Items.Data {
		if item == nil {
			continue
		}
		if configuredPriceID != "" && item.Price != nil && item.Price.ID == configuredPriceID {
			selected = item
			break
		}
	}
	if selected == nil && len(subscription.Items.Data) == 1 {
		selected = subscription.Items.Data[0]
	}
	if selected == nil {
		return time.Time{}, time.Time{}, fmt.Errorf("subscription does not contain the configured Pro price")
	}
	if selected.CurrentPeriodStart <= 0 || selected.CurrentPeriodEnd <= selected.CurrentPeriodStart {
		return time.Time{}, time.Time{}, fmt.Errorf("subscription item has an invalid billing period")
	}

	return time.Unix(selected.CurrentPeriodStart, 0).UTC(), time.Unix(selected.CurrentPeriodEnd, 0).UTC(), nil
}

func invoiceSubscriptionID(invoice *stripego.Invoice) (string, error) {
	if invoice == nil || invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
		return "", fmt.Errorf("invoice is not linked to a subscription")
	}
	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
	if subscriptionID == "" {
		return "", fmt.Errorf("invoice subscription ID is missing")
	}
	return subscriptionID, nil
}

func stripeCustomerID(subscription *stripego.Subscription) string {
	if subscription == nil || subscription.Customer == nil {
		return ""
	}
	return subscription.Customer.ID
}

func stripeEventRecord(event stripego.Event, objectID string, priority int16) db.StripeEventRecord {
	return db.StripeEventRecord{
		ID:        event.ID,
		Type:      string(event.Type),
		ObjectID:  objectID,
		CreatedAt: event.Created,
		Priority:  priority,
	}
}

func subscriptionPaymentStatus(status stripego.SubscriptionStatus) string {
	if status == stripego.SubscriptionStatusActive || status == stripego.SubscriptionStatusTrialing {
		return "paid"
	}
	return "failed"
}

func writeStripeDecodeError(w http.ResponseWriter, r *http.Request, eventType stripego.EventType, err error) {
	captureHandlerError(r, observability.CodeStripeWebhookDecodeFailed, err, "stripe_webhook", "decode_"+string(eventType))
	http.Error(w, "Failed to parse Stripe event", http.StatusBadRequest)
}

func writeStripeProcessingError(w http.ResponseWriter, r *http.Request, eventType stripego.EventType, err error) {
	captureHandlerError(r, observability.CodeStripeWebhookProcessFailed, err, "stripe_webhook", "process_"+string(eventType))
	http.Error(w, "Failed to process Stripe event", http.StatusInternalServerError)
}
