package stripe

import (
	"os"

	stripego "github.com/stripe/stripe-go/v85"
)

//Sets up stripe config

func NewStripeClient() *stripego.Client {
	return stripego.NewClient(os.Getenv("STRIPE_SECRET_KEY"))

}
