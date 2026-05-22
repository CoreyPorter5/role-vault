package db

import (
	"context"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func GetUserProfile(userID string) (models.Profile, error) {
	var userProfile models.Profile
	query := `SELECT user_id, email, created_at::text, updated_at::text, first_name, last_name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, stripe_payment_status, resume_generations_used, resume_generation_limit, resume_usage_period_start::text, resume_usage_period_end::text FROM profiles WHERE user_id = $1`
	row := Conn.QueryRow(context.Background(), query, userID)
	err := row.Scan(
		&userProfile.UserID,
		&userProfile.Email,
		&userProfile.CreatedAt,
		&userProfile.UpdatedAt,
		&userProfile.FirstName,
		&userProfile.LastName,
		&userProfile.Plan,
		&userProfile.SubscriptionStatus,
		&userProfile.StripeCustomerID,
		&userProfile.StripeSubscriptionID,
		&userProfile.StripePaymentStatus,
		&userProfile.ResumeGenerationsUsed,
		&userProfile.ResumeGenerationsLimit,
		&userProfile.ResumeUsagePeriodStart,
		&userProfile.ResumeUsagePeriodEnd,
	)

	if err != nil {
		fmt.Printf("Error getting user profile from DB for user: %s. Error: %v", userID, err)
		return userProfile, err
	}

	return userProfile, nil

}
