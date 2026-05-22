package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	stripego "github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/webhook"
)

//Handles unauthenticated stripe webhook events

func StripeWebhookHandler(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)

	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusServiceUnavailable)
		return
	}

	signatureHeader := r.Header.Get("Stripe-Signature")
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET_KEY")

	event, err := webhook.ConstructEvent(payload, signatureHeader, endpointSecret)
	if err != nil {
		fmt.Print("Stripe webhook signature verification failed: %n\n", err)
		http.Error(w, "Invalid Stripe Signature", http.StatusBadRequest)
		return
	}

	switch event.Type {

	case "checkout.session.completed":
		var session stripego.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			http.Error(w, "Failed to parse checkout session", http.StatusBadRequest)
			return
		}
		if err := handleCheckoutSessionCompleted(session); err != nil {
			fmt.Printf("Failed to handle checkout.session.completed: %v\n", err)
			http.Error(w, "Failed to process checkout session", http.StatusInternalServerError)
			return
		}

	case "customer.subscription.updated":
		var subscription stripego.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			http.Error(w, "Failed to parse subscription", http.StatusBadRequest)
		}

		if err := handleSubscriptionUpdated(subscription); err != nil {
			fmt.Printf("Failed to handle customer.subscription.updated: %v\n", err)
			http.Error(w, "Failed to update subscription", http.StatusInternalServerError)
			return
		}

	case "customer.subscription.deleted":
		var subscription stripego.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			http.Error(w, "Failed to parse subscription", http.StatusBadRequest)
		}

		if err := handleSubscriptionDeleted(subscription); err != nil {
			fmt.Printf("Failed to handle customer.subscription.deleted: %v\n", err)
			http.Error(w, "Failed to delete subscription", http.StatusInternalServerError)
			return
		}

	default:
		fmt.Printf("Unhandled Stripe event type: %v\n", event.Type)
	}

	w.WriteHeader(http.StatusOK)

}

func handleCheckoutSessionCompleted(session stripego.CheckoutSession) error {
	userID := session.Metadata["user_id"]
	if userID == "" {
		userID = session.ClientReferenceID
	}

	if userID == "" {
		return fmt.Errorf("Missing user_id in checkout session metadata/client_reference_id\n")
	}

	if session.Customer == nil {
		return fmt.Errorf("Missing stripe customer on checkout session\n")
	}

	if session.Subscription == nil {
		return fmt.Errorf("Missing Stripe subscription on checkout session \n")
	}

	stripeCustomerID := session.Customer.ID
	stripeSubscriptionID := session.Subscription.ID
	return db.ActivateUserProSubscription(userID, stripeCustomerID, stripeSubscriptionID, string(session.PaymentStatus))

}

func handleSubscriptionUpdated(subscription stripego.Subscription) error {
	if subscription.ID == "" {
		return fmt.Errorf("Missing subscription ID\n")
	}

	return db.UpdateUserSubscriptionStatusBySubscriptionID(subscription.ID, string(subscription.Status))
}

func handleSubscriptionDeleted(subscription stripego.Subscription) error {
	if subscription.ID == "" {
		return fmt.Errorf("Missing subscription ID\n")
	}
	return db.DowngradeUserBySubscriptionID(subscription.ID)
}

//Add payment failed hook later
