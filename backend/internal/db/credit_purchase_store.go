package db

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type StripeCreditPurchase struct {
	UserID            string
	PurchaseID        string
	CheckoutSessionID string
	PaymentIntentID   string
	CustomerID        string
	PackCode          string
	Credits           int
	AmountTotal       int64
	Currency          string
}

func ApplyStripeCreditPurchase(
	ctx context.Context,
	event StripeEventRecord,
	purchase StripeCreditPurchase,
) (bool, error) {
	if err := validateStripeCreditPurchase(purchase); err != nil {
		return false, err
	}

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

	var insertedSessionID string
	err = tx.QueryRow(
		ctx,
		`INSERT INTO stripe_credit_purchases (
		   checkout_session_id,
		   purchase_id,
		   user_id,
		   stripe_event_id,
		   payment_intent_id,
		   customer_id,
		   pack_code,
		   credits_granted,
		   amount_total,
		   currency
		 ) VALUES (
		   $1,
		   $2::uuid,
		   $3,
		   $4,
		   NULLIF($5, ''),
		   NULLIF($6, ''),
		   $7,
		   $8,
		   $9,
		   $10
		 )
		 ON CONFLICT (checkout_session_id) DO NOTHING
		 RETURNING checkout_session_id`,
		purchase.CheckoutSessionID,
		purchase.PurchaseID,
		purchase.UserID,
		event.ID,
		purchase.PaymentIntentID,
		purchase.CustomerID,
		purchase.PackCode,
		purchase.Credits,
		purchase.AmountTotal,
		strings.ToLower(purchase.Currency),
	).Scan(&insertedSessionID)
	if errors.Is(err, pgx.ErrNoRows) {
		if err := validateExistingStripeCreditPurchase(ctx, tx, purchase); err != nil {
			return false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if err != nil {
		return false, err
	}

	wallet, err := lockDocumentCreditWallet(ctx, tx, purchase.UserID)
	if err != nil {
		return false, err
	}
	wallet.Purchased += purchase.Credits
	if err := updateDocumentCreditWallet(ctx, tx, purchase.UserID, wallet); err != nil {
		return false, err
	}
	if purchase.CustomerID != "" {
		if _, err := tx.Exec(
			ctx,
			`UPDATE profiles
			 SET stripe_customer_id = $2,
			     updated_at = now()
			 WHERE user_id = $1`,
			purchase.UserID,
			purchase.CustomerID,
		); err != nil {
			return false, err
		}
	}
	if err := insertDocumentCreditTransaction(ctx, tx, documentCreditTransaction{
		UserID:                  purchase.UserID,
		TransactionType:         "purchase",
		CreditBucket:            creditBucketPurchased,
		Delta:                   purchase.Credits,
		BalanceAfter:            wallet.balance(),
		StripeCheckoutSessionID: purchase.CheckoutSessionID,
		StripePaymentIntentID:   purchase.PaymentIntentID,
		StripeEventID:           event.ID,
		PackCode:                purchase.PackCode,
		CreatedAt:               time.Now().UTC(),
	}); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func ApplyStripeCreditPurchaseRefund(
	ctx context.Context,
	event StripeEventRecord,
	paymentIntentID string,
	amountRefunded int64,
) (bool, error) {
	if strings.TrimSpace(paymentIntentID) == "" {
		return false, errors.New("Stripe refund is missing its payment intent")
	}
	if amountRefunded <= 0 {
		return false, errors.New("Stripe refund amount must be positive")
	}

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

	var purchase struct {
		UserID          string
		CheckoutSession string
		PackCode        string
		CreditsGranted  int
		CreditsReversed int
		AmountTotal     int64
	}
	if err := tx.QueryRow(
		ctx,
		`SELECT user_id::text,
		        checkout_session_id,
		        pack_code,
		        credits_granted,
		        credits_reversed,
		        amount_total
		 FROM stripe_credit_purchases
		 WHERE payment_intent_id = $1
		 FOR UPDATE`,
		paymentIntentID,
	).Scan(
		&purchase.UserID,
		&purchase.CheckoutSession,
		&purchase.PackCode,
		&purchase.CreditsGranted,
		&purchase.CreditsReversed,
		&purchase.AmountTotal,
	); err != nil {
		return false, fmt.Errorf("find Stripe credit purchase for refund: %w", err)
	}
	if purchase.AmountTotal <= 0 {
		return false, errors.New("Stripe credit purchase has an invalid amount")
	}
	targetReversal := stripeCreditRefundTarget(purchase.CreditsGranted, purchase.AmountTotal, amountRefunded)
	additionalReversal := targetReversal - purchase.CreditsReversed
	if additionalReversal < 0 {
		additionalReversal = 0
	}

	wallet, err := lockDocumentCreditWallet(ctx, tx, purchase.UserID)
	if err != nil {
		return false, err
	}
	actualReversal := min(additionalReversal, wallet.Purchased)
	if actualReversal > 0 {
		wallet.Purchased -= actualReversal
		if err := updateDocumentCreditWallet(ctx, tx, purchase.UserID, wallet); err != nil {
			return false, err
		}
		if err := insertDocumentCreditTransaction(ctx, tx, documentCreditTransaction{
			UserID:                  purchase.UserID,
			TransactionType:         "purchase_reversal",
			CreditBucket:            creditBucketPurchased,
			Delta:                   -actualReversal,
			BalanceAfter:            wallet.balance(),
			StripeCheckoutSessionID: purchase.CheckoutSession,
			StripePaymentIntentID:   paymentIntentID,
			StripeEventID:           event.ID,
			PackCode:                purchase.PackCode,
			CreatedAt:               time.Now().UTC(),
		}); err != nil {
			return false, err
		}
	}

	creditsReversed := purchase.CreditsReversed + actualReversal
	status := "partially_reversed"
	if creditsReversed >= purchase.CreditsGranted {
		status = "reversed"
	}
	if _, err := tx.Exec(
		ctx,
		`UPDATE stripe_credit_purchases
		 SET credits_reversed = $2,
		     status = $3,
		     updated_at = now()
		 WHERE checkout_session_id = $1`,
		purchase.CheckoutSession,
		creditsReversed,
		status,
	); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return actualReversal > 0, nil
}

func validateStripeCreditPurchase(purchase StripeCreditPurchase) error {
	switch {
	case strings.TrimSpace(purchase.UserID) == "":
		return errors.New("Stripe credit purchase is missing its user")
	case strings.TrimSpace(purchase.PurchaseID) == "":
		return errors.New("Stripe credit purchase is missing its purchase ID")
	case strings.TrimSpace(purchase.CheckoutSessionID) == "":
		return errors.New("Stripe credit purchase is missing its Checkout Session")
	case purchase.Credits <= 0:
		return errors.New("Stripe credit purchase credits must be positive")
	case purchase.AmountTotal <= 0:
		return errors.New("Stripe credit purchase amount must be positive")
	case len(strings.TrimSpace(purchase.Currency)) != 3:
		return errors.New("Stripe credit purchase currency is invalid")
	case strings.TrimSpace(purchase.PackCode) == "":
		return errors.New("Stripe credit purchase is missing its pack")
	default:
		return nil
	}
}

func validateExistingStripeCreditPurchase(ctx context.Context, tx pgx.Tx, purchase StripeCreditPurchase) error {
	var purchaseID, userID, packCode string
	var credits int
	var amountTotal int64
	if err := tx.QueryRow(
		ctx,
		`SELECT purchase_id::text, user_id::text, pack_code, credits_granted, amount_total
		 FROM stripe_credit_purchases
		 WHERE checkout_session_id = $1`,
		purchase.CheckoutSessionID,
	).Scan(&purchaseID, &userID, &packCode, &credits, &amountTotal); err != nil {
		return err
	}
	if purchaseID != purchase.PurchaseID || userID != purchase.UserID || packCode != purchase.PackCode || credits != purchase.Credits || amountTotal != purchase.AmountTotal {
		return errors.New("Stripe Checkout Session conflicts with an existing credit purchase")
	}
	return nil
}

func stripeCreditRefundTarget(creditsGranted int, amountTotal, amountRefunded int64) int {
	if creditsGranted <= 0 || amountTotal <= 0 || amountRefunded <= 0 {
		return 0
	}
	if amountRefunded >= amountTotal {
		return creditsGranted
	}
	return int(int64(creditsGranted) * amountRefunded / amountTotal)
}
