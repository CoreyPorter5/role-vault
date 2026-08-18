package stripe

import (
	"context"
	"os"

	stripego "github.com/stripe/stripe-go/v86"
)

func CreateCustomerPortalSession(ctx context.Context, sc *stripego.Client, stripeCustomerID string) (*stripego.BillingPortalSession, error) {
	params := &stripego.BillingPortalSessionCreateParams{
		Customer:  stripego.String(stripeCustomerID),
		ReturnURL: stripego.String(os.Getenv("FRONTEND_URL") + "/dashboard/billing"),
	}

	return sc.V1BillingPortalSessions.Create(ctx, params)
}
