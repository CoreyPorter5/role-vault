package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/analytics"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	stripeService "github.com/CoreyPorter5/seek-sync/backend/internal/stripe"
	"github.com/google/uuid"
	stripego "github.com/stripe/stripe-go/v86"
	"github.com/stripe/stripe-go/v86/webhook"
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
	case stripego.EventTypeCheckoutSessionCompleted, stripego.EventTypeCheckoutSessionAsyncPaymentSucceeded:
		var session stripego.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleCheckoutSessionCompleted(r.Context(), event, session); err != nil {
			writeStripeProcessingError(w, r, event.Type, err)
			return
		}

	case stripego.EventTypeChargeRefunded:
		var charge stripego.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			writeStripeDecodeError(w, r, event.Type, err)
			return
		}
		if err := handleChargeRefunded(r.Context(), event, charge); err != nil {
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
	if session.Mode == stripego.CheckoutSessionModePayment || session.Metadata["purchase_type"] == "document_credits" {
		return handleCreditCheckoutSession(ctx, event, session)
	}
	return handleLegacySubscriptionCheckoutSession(ctx, event, session)
}

func handleCreditCheckoutSession(ctx context.Context, event stripego.Event, session stripego.CheckoutSession) error {
	purchase, shouldFulfil, err := stripeCreditPurchaseFromCheckout(session)
	if err != nil || !shouldFulfil {
		return err
	}
	applied, err := db.ApplyStripeCreditPurchase(ctx, stripeEventRecord(event, session.ID, stripePriorityCheckout), purchase)
	if err == nil && applied {
		analytics.Capture(purchase.UserID, analytics.EventCreditsPurchased, analytics.Properties{
			"pack_code":    purchase.PackCode,
			"credits":      purchase.Credits,
			"amount_minor": purchase.AmountTotal,
			"currency":     purchase.Currency,
		})
	}
	return err
}

func stripeCreditPurchaseFromCheckout(session stripego.CheckoutSession) (db.StripeCreditPurchase, bool, error) {
	if session.Mode != stripego.CheckoutSessionModePayment {
		return db.StripeCreditPurchase{}, false, fmt.Errorf("document credit checkout has unexpected mode %q", session.Mode)
	}
	if session.Metadata["purchase_type"] != "document_credits" {
		return db.StripeCreditPurchase{}, false, errors.New("payment Checkout Session is missing document credit metadata")
	}
	if session.PaymentStatus != stripego.CheckoutSessionPaymentStatusPaid && session.PaymentStatus != stripego.CheckoutSessionPaymentStatusNoPaymentRequired {
		// Some payment methods complete asynchronously. The corresponding
		// async_payment_succeeded event will grant the credits after payment.
		return db.StripeCreditPurchase{}, false, nil
	}
	if session.ID == "" {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout is missing its session ID")
	}
	userID := session.Metadata["user_id"]
	if userID == "" {
		userID = session.ClientReferenceID
	}
	if userID == "" {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout is missing its user")
	}
	purchaseID := session.Metadata["purchase_id"]
	if _, err := uuid.Parse(purchaseID); err != nil {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout has an invalid purchase ID")
	}
	pack, err := stripeService.CreditPackForCode(session.Metadata["pack_code"])
	if err != nil {
		return db.StripeCreditPurchase{}, false, err
	}
	credits, err := strconv.Atoi(session.Metadata["credits"])
	if err != nil || credits != pack.Credits {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout has invalid credit metadata")
	}
	if session.AmountTotal != pack.AmountTotal || string(session.Currency) != pack.Currency {
		return db.StripeCreditPurchase{}, false, fmt.Errorf("document credit checkout amount does not match pack %s", pack.Code)
	}
	if session.Customer == nil || session.Customer.ID == "" {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout is missing its customer")
	}
	if session.PaymentIntent == nil || session.PaymentIntent.ID == "" {
		return db.StripeCreditPurchase{}, false, errors.New("document credit checkout is missing its payment intent")
	}

	return db.StripeCreditPurchase{
		UserID:            userID,
		PurchaseID:        purchaseID,
		CheckoutSessionID: session.ID,
		PaymentIntentID:   session.PaymentIntent.ID,
		CustomerID:        session.Customer.ID,
		PackCode:          pack.Code,
		Credits:           pack.Credits,
		AmountTotal:       pack.AmountTotal,
		Currency:          pack.Currency,
	}, true, nil
}

func handleChargeRefunded(ctx context.Context, event stripego.Event, charge stripego.Charge) error {
	purchaseType := charge.Metadata["purchase_type"]
	if purchaseType == "" && charge.PaymentIntent != nil {
		purchaseType = charge.PaymentIntent.Metadata["purchase_type"]
	}
	if purchaseType != "document_credits" {
		return nil
	}
	if charge.PaymentIntent == nil || charge.PaymentIntent.ID == "" {
		return errors.New("document credit refund is missing its payment intent")
	}
	_, err := db.ApplyStripeCreditPurchaseRefund(
		ctx,
		stripeEventRecord(event, charge.ID, stripePriorityPaymentFailed),
		charge.PaymentIntent.ID,
		charge.AmountRefunded,
	)
	return err
}

func handleLegacySubscriptionCheckoutSession(ctx context.Context, event stripego.Event, session stripego.CheckoutSession) error {
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
	action, periodStart, periodEnd, err := paidInvoiceEntitlement(subscription, invoice.BillingReason)
	if err != nil {
		return err
	}

	_, err = db.ApplyStripeSubscriptionEvent(ctx, stripeEventRecord(event, invoice.ID, stripePriorityInvoicePaid), db.StripeSubscriptionUpdate{
		UserID:             subscription.Metadata["user_id"],
		CustomerID:         stripeCustomerID(subscription),
		SubscriptionID:     subscription.ID,
		SubscriptionStatus: string(subscription.Status),
		PaymentStatus:      "paid",
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		Action:             action,
	})
	return err
}

func paidInvoiceEntitlement(
	subscription *stripego.Subscription,
	billingReason stripego.InvoiceBillingReason,
) (db.StripeEntitlementAction, time.Time, time.Time, error) {
	if _, err := configuredStripeSubscriptionItem(subscription); err != nil {
		return "", time.Time{}, time.Time{}, err
	}

	if subscription.Status != stripego.SubscriptionStatusActive && subscription.Status != stripego.SubscriptionStatusTrialing {
		action := db.StripeDowngradeRecoverable
		if subscription.Status == stripego.SubscriptionStatusCanceled || subscription.Status == stripego.SubscriptionStatusIncompleteExpired {
			action = db.StripeDowngradeTerminal
		}
		return action, time.Time{}, time.Time{}, nil
	}

	periodStart, periodEnd, err := stripeSubscriptionPeriod(subscription)
	if err != nil {
		return "", time.Time{}, time.Time{}, err
	}
	action := db.StripeActivatePreservingUsage
	if billingReason == stripego.InvoiceBillingReasonSubscriptionCycle {
		action = db.StripeRenewAndResetUsage
	}
	return action, periodStart, periodEnd, nil
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
	selected, err := configuredStripeSubscriptionItem(subscription)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	if selected.CurrentPeriodStart <= 0 || selected.CurrentPeriodEnd <= selected.CurrentPeriodStart {
		return time.Time{}, time.Time{}, fmt.Errorf("subscription item has an invalid billing period")
	}

	return time.Unix(selected.CurrentPeriodStart, 0).UTC(), time.Unix(selected.CurrentPeriodEnd, 0).UTC(), nil
}

func configuredStripeSubscriptionItem(subscription *stripego.Subscription) (*stripego.SubscriptionItem, error) {
	if subscription == nil || subscription.Items == nil || len(subscription.Items.Data) == 0 {
		return nil, fmt.Errorf("subscription is missing billing period items")
	}
	configuredPriceID := strings.TrimSpace(os.Getenv("STRIPE_PRO_PRICE_ID"))
	if configuredPriceID == "" {
		return nil, fmt.Errorf("Stripe Pro price is not configured")
	}
	for _, item := range subscription.Items.Data {
		if item != nil && item.Price != nil && item.Price.ID == configuredPriceID {
			return item, nil
		}
	}
	return nil, fmt.Errorf("subscription does not contain the configured Pro price")
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
