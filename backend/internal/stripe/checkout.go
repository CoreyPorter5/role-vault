package stripe

import (
	"context"
	"os"

	stripego "github.com/stripe/stripe-go/v85"
)

//Responsible for creating stripe sessions

func CreateCheckoutSession(sc *stripego.Client, userID string) (*stripego.CheckoutSession, error) {
	params := &stripego.CheckoutSessionCreateParams{
		Mode:              stripego.String(stripego.CheckoutSessionModeSubscription),
		LineItems:         []*stripego.CheckoutSessionCreateLineItemParams{{Price: stripego.String(os.Getenv("STRIPE_PRO_PRICE_ID")), Quantity: stripego.Int64(1)}},
		SuccessURL:        stripego.String(os.Getenv("FRONTEND_URL") + "/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripego.String(os.Getenv("FRONTEND_URL") + "/dashboard/upgrade?cancelled=true"),
		ClientReferenceID: stripego.String(userID),
		Metadata:          map[string]string{"user_id": userID, "plan": "pro"},
		SubscriptionData: &stripego.CheckoutSessionCreateSubscriptionDataParams{
			Metadata: map[string]string{"user_id": userID, "plan": "pro"},
		},
	}
	return sc.V1CheckoutSessions.Create(context.Background(), params)
}
