package db

import (
	"context"
	"fmt"
	"time"
)

func ActivateUserProSubscription(userID string, stripeCustomerID string, stripeSubscriptionID string, paymentStatus string) error {
	now := time.Now().UTC()
	oneMonthFromNow := now.AddDate(0, 1, 0)
	const proResumeGenerationLimit = 100
	query := `UPDATE profiles SET plan = $1, subscription_status = $2, stripe_customer_id = $3, stripe_subscription_id = $4, stripe_payment_status = $5, resume_generation_limit = $6, updated_at = now(), resume_usage_period_start = $7, resume_usage_period_end = $8 WHERE user_id = $9`
	commandTag, err := Conn.Exec(context.Background(), query, "pro", "active", stripeCustomerID, stripeSubscriptionID, paymentStatus, proResumeGenerationLimit, now, oneMonthFromNow, userID)
	if err != nil {
		fmt.Printf("Database error activating pro subscription for user %s: %v\n", userID, err)
		return err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Profile for user %s does not exist\n", userID)
		return nil
	}
	fmt.Printf("Successfully updated profile to pro plan for user %s\n", userID)
	return nil
}

func UpdateUserSubscriptionStatusBySubscriptionID(subscriptionID string, status string) error {
	plan := "free"
	resumeLimit := 3
	if status == "active" || status == "trialing" {
		plan = "pro"
		resumeLimit = 100
	}
	query := `UPDATE profiles SET plan = $1, subscription_status = $2, resume_generation_limit = $3, updated_at = now() WHERE stripe_subscription_id = $4`
	commandTag, err := Conn.Exec(context.Background(), query, plan, status, resumeLimit, subscriptionID)
	if err != nil {
		fmt.Printf("Database error updating subscription status for subscription %s: %v\n", subscriptionID, err)
		return err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Profile for subscription %s does not exist\n", subscriptionID)
		return nil
	}
	fmt.Printf("Updated subscription %s status to %s and plan to %s\n", subscriptionID, status, plan)
	return nil
}

func DowngradeUserBySubscriptionID(subscriptionID string) error {
	plan := "free"
	resumeLimit := 3
	subscriptionStatus := "canceled"
	now := time.Now().UTC()
	oneMonthFromNow := now.AddDate(0, 1, 0)
	query := `UPDATE profiles SET plan = $1, subscription_status = $2, stripe_subscription_id = NULL, stripe_payment_status = NULL, resume_generation_limit = $3, resume_generations_used = 0, resume_usage_period_start = $4, resume_usage_period_end = $5, updated_at = now() WHERE stripe_subscription_id = $6`
	commandTag, err := Conn.Exec(context.Background(), query, plan, subscriptionStatus, resumeLimit, now, oneMonthFromNow, subscriptionID)
	if err != nil {
		fmt.Printf("Database error downgrading subscription status for subscription %s: %v\n", subscriptionID, err)
		return err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Profile for subscription %s does not exist\n", subscriptionID)
		return nil
	}
	fmt.Printf("Updated subscription %s status to canceled and plan to %s\n", subscriptionID, plan)
	return nil

}
