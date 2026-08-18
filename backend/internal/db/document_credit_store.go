package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

const (
	documentTypeResume      = "resume"
	documentTypeCoverLetter = "cover_letter"
	creditBucketPromotional = "promotional"
	creditBucketPurchased   = "purchased"
)

var ErrDocumentCreditsExhausted = errors.New("document credits exhausted")

type documentCreditWallet struct {
	Promotional int
	Purchased   int
}

func (wallet documentCreditWallet) balance() int {
	return wallet.Promotional + wallet.Purchased
}

func GetDocumentCreditUsage(ctx context.Context, userID string) (models.DocumentCreditUsage, error) {
	tx, err := Conn.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.DocumentCreditUsage{}, err
	}
	defer tx.Rollback(ctx)

	wallet, err := lockDocumentCreditWallet(ctx, tx, userID)
	if err != nil {
		return models.DocumentCreditUsage{}, err
	}
	now := time.Now().UTC()
	if err := refundStaleDocumentGenerations(ctx, tx, userID, &wallet, now); err != nil {
		return models.DocumentCreditUsage{}, err
	}

	usage, err := documentCreditUsage(ctx, tx, userID, wallet)
	if err != nil {
		return models.DocumentCreditUsage{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.DocumentCreditUsage{}, err
	}
	return usage, nil
}

func lockDocumentCreditWallet(ctx context.Context, tx pgx.Tx, userID string) (documentCreditWallet, error) {
	var wallet documentCreditWallet
	err := tx.QueryRow(
		ctx,
		`SELECT document_credits_promotional, document_credits_purchased
		 FROM profiles
		 WHERE user_id = $1
		 FOR UPDATE`,
		userID,
	).Scan(&wallet.Promotional, &wallet.Purchased)
	if errors.Is(err, pgx.ErrNoRows) {
		return documentCreditWallet{}, ErrProfileNotFound
	}
	if err != nil {
		return documentCreditWallet{}, err
	}
	return wallet, nil
}

func debitDocumentCredit(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	wallet *documentCreditWallet,
	documentType string,
	generationID string,
	now time.Time,
) (string, error) {
	creditBucket := ""
	switch {
	case wallet.Promotional > 0:
		wallet.Promotional--
		creditBucket = creditBucketPromotional
	case wallet.Purchased > 0:
		wallet.Purchased--
		creditBucket = creditBucketPurchased
	default:
		return "", ErrDocumentCreditsExhausted
	}

	if err := updateDocumentCreditWallet(ctx, tx, userID, *wallet); err != nil {
		return "", err
	}
	if err := insertDocumentCreditTransaction(ctx, tx, documentCreditTransaction{
		UserID:          userID,
		TransactionType: "generation_reservation",
		CreditBucket:    creditBucket,
		Delta:           -1,
		BalanceAfter:    wallet.balance(),
		DocumentType:    documentType,
		GenerationID:    generationID,
		CreatedAt:       now,
	}); err != nil {
		return "", err
	}
	return creditBucket, nil
}

func restoreDocumentCredit(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	wallet *documentCreditWallet,
	creditBucket string,
	documentType string,
	generationID string,
	now time.Time,
) error {
	switch creditBucket {
	case creditBucketPromotional:
		wallet.Promotional++
	case creditBucketPurchased:
		wallet.Purchased++
	default:
		return fmt.Errorf("generation %s has unsupported credit bucket %q", generationID, creditBucket)
	}

	if err := updateDocumentCreditWallet(ctx, tx, userID, *wallet); err != nil {
		return err
	}
	return insertDocumentCreditTransaction(ctx, tx, documentCreditTransaction{
		UserID:          userID,
		TransactionType: "generation_refund",
		CreditBucket:    creditBucket,
		Delta:           1,
		BalanceAfter:    wallet.balance(),
		DocumentType:    documentType,
		GenerationID:    generationID,
		CreatedAt:       now,
	})
}

func updateDocumentCreditWallet(ctx context.Context, tx pgx.Tx, userID string, wallet documentCreditWallet) error {
	_, err := tx.Exec(
		ctx,
		`UPDATE profiles
		 SET document_credits_promotional = $2,
		     document_credits_purchased = $3,
		     updated_at = now()
		 WHERE user_id = $1`,
		userID,
		wallet.Promotional,
		wallet.Purchased,
	)
	return err
}

type documentCreditTransaction struct {
	UserID                  string
	TransactionType         string
	CreditBucket            string
	Delta                   int
	BalanceAfter            int
	DocumentType            string
	GenerationID            string
	StripeCheckoutSessionID string
	StripePaymentIntentID   string
	StripeEventID           string
	PackCode                string
	CreatedAt               time.Time
}

func insertDocumentCreditTransaction(ctx context.Context, tx pgx.Tx, transaction documentCreditTransaction) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO document_credit_transactions (
		   user_id,
		   transaction_type,
		   credit_bucket,
		   delta,
		   balance_after,
		   document_type,
		   generation_id,
		   stripe_checkout_session_id,
		   stripe_payment_intent_id,
		   stripe_event_id,
		   pack_code,
		   created_at
		 ) VALUES (
		   $1,
		   $2,
		   $3,
		   $4,
		   $5,
		   NULLIF($6, ''),
		   NULLIF($7, '')::uuid,
		   NULLIF($8, ''),
		   NULLIF($9, ''),
		   NULLIF($10, ''),
		   NULLIF($11, ''),
		   $12
		 )`,
		transaction.UserID,
		transaction.TransactionType,
		transaction.CreditBucket,
		transaction.Delta,
		transaction.BalanceAfter,
		transaction.DocumentType,
		transaction.GenerationID,
		transaction.StripeCheckoutSessionID,
		transaction.StripePaymentIntentID,
		transaction.StripeEventID,
		transaction.PackCode,
		transaction.CreatedAt,
	)
	return err
}

func refundStaleDocumentGenerations(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	wallet *documentCreditWallet,
	now time.Time,
) error {
	if err := refundStaleDocumentGenerationTable(
		ctx,
		tx,
		userID,
		wallet,
		now,
		"resume_generation_attempts",
		documentTypeResume,
	); err != nil {
		return err
	}
	return refundStaleDocumentGenerationTable(
		ctx,
		tx,
		userID,
		wallet,
		now,
		"cover_letter_generation_attempts",
		documentTypeCoverLetter,
	)
}

func refundStaleDocumentGenerationTable(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	wallet *documentCreditWallet,
	now time.Time,
	tableName string,
	documentType string,
) error {
	if tableName != "resume_generation_attempts" && tableName != "cover_letter_generation_attempts" {
		return fmt.Errorf("unsupported generation attempt table %q", tableName)
	}

	query := fmt.Sprintf(
		`UPDATE %s
		 SET status = 'refunded',
		     failure_code = 'stale_generation',
		     failure_detail = 'Generation did not finish before the stale-attempt deadline.',
		     credit_charged = false,
		     refunded_at = $3,
		     updated_at = $3
		 WHERE user_id = $1
		   AND status = 'reserved'
		   AND credit_charged = true
		   AND created_at < $2
		 RETURNING id::text, credit_bucket`,
		tableName,
	)
	rows, err := tx.Query(ctx, query, userID, now.Add(-staleGenerationAge), now)
	if err != nil {
		return err
	}
	defer rows.Close()

	type staleCredit struct {
		generationID string
		creditBucket string
	}
	var stale []staleCredit
	for rows.Next() {
		var item staleCredit
		if err := rows.Scan(&item.generationID, &item.creditBucket); err != nil {
			return err
		}
		stale = append(stale, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	rows.Close()

	for _, item := range stale {
		if err := restoreDocumentCredit(
			ctx,
			tx,
			userID,
			wallet,
			item.creditBucket,
			documentType,
			item.generationID,
			now,
		); err != nil {
			return err
		}
	}
	return nil
}

func documentCreditUsage(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	wallet documentCreditWallet,
) (models.DocumentCreditUsage, error) {
	var resumesGenerated, coverLettersGenerated int
	if err := tx.QueryRow(
		ctx,
		`SELECT
		   (SELECT count(*) FROM resume_generation_attempts WHERE user_id = $1 AND status = 'succeeded'),
		   (SELECT count(*) FROM cover_letter_generation_attempts WHERE user_id = $1 AND status = 'succeeded')`,
		userID,
	).Scan(&resumesGenerated, &coverLettersGenerated); err != nil {
		return models.DocumentCreditUsage{}, err
	}

	return models.DocumentCreditUsage{
		Balance:               wallet.balance(),
		PromotionalBalance:    wallet.Promotional,
		PurchasedBalance:      wallet.Purchased,
		CanGenerate:           wallet.balance() > 0,
		ResumesGenerated:      resumesGenerated,
		CoverLettersGenerated: coverLettersGenerated,
	}, nil
}
