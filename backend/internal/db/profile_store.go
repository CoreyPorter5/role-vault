package db

import (
	"context"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func GetUserProfile(ctx context.Context, userID string) (models.Profile, error) {
	var userProfile models.Profile
	query := `SELECT user_id, email, created_at::text, updated_at::text, first_name, last_name, plan,
	                 subscription_status, stripe_customer_id, stripe_subscription_id, stripe_payment_status,
	                 resume_generations_used, resume_generations_limit,
	                 cover_letter_generations_used, cover_letter_generations_limit,
	                 resume_usage_period_start::text, resume_usage_period_end::text,
	                 document_credits_promotional, document_credits_purchased
	          FROM profiles WHERE user_id = $1`
	row := Conn.QueryRow(ctx, query, userID)
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
		&userProfile.CoverLetterGenerationsUsed,
		&userProfile.CoverLetterGenerationsLimit,
		&userProfile.ResumeUsagePeriodStart,
		&userProfile.ResumeUsagePeriodEnd,
		&userProfile.DocumentCreditsPromotional,
		&userProfile.DocumentCreditsPurchased,
	)

	if err != nil {
		return userProfile, err
	}

	userProfile.DocumentCreditsBalance = userProfile.DocumentCreditsPromotional + userProfile.DocumentCreditsPurchased
	userProfile.HasLegacySubscription = userProfile.StripeSubscriptionID != nil && *userProfile.StripeSubscriptionID != ""
	return userProfile, nil

}
