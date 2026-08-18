# Document credits rollout

SeekSync now uses a shared, non-expiring document-credit wallet instead of creating new monthly subscriptions.

## Required deployment order

1. Apply `supabase/migrations/20260818090000_document_credit_wallet.sql`.
2. Create the two one-time Stripe Prices in the environment being deployed.
3. Set the backend environment variables below to those Price IDs.
4. Deploy the backend, then deploy the frontend.
5. Configure the production Stripe webhook and complete the smoke tests below.

Do not deploy the updated backend before the migration. Generation reservations read the new profile columns transactionally.

## Backend configuration

```dotenv
STRIPE_DOCUMENT_CREDITS_100_PRICE_ID=price_...
STRIPE_DOCUMENT_CREDITS_250_PRICE_ID=price_...
```

The backend, not the browser, maps each pack code to its trusted Price ID, AUD amount, and credit quantity.

The local test-mode objects created for development are:

- `credits_100`: product `prod_V5ooQP6h6Ss8zy`, price `price_1U5dBLJ5ud9DTXwTyWuWmNhw` (A$9.99, one time)
- `credits_250`: product `prod_V5ooNZXugz7Tpt`, price `price_1U5dBTJ5ud9DTXwTXK76xHW3` (A$19.99, one time)

Create separate live-mode objects for launch. Never use test Price IDs with a live secret key.

## Stripe webhook

The signed backend webhook must receive:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`

Create the endpoint with Stripe API version `2026-07-29.dahlia`, matching `stripe-go/v86.3.0`.

Keep the existing subscription and invoice events enabled while any legacy subscription still exists. New Checkout Sessions are always created with `mode=payment`.

## Smoke tests

In Stripe test mode:

1. Confirm a new account starts with six promotional credits.
2. Generate one resume and one cover letter; the shared balance should fall by two.
3. Force a generation failure; its reserved credit should be restored to the same bucket.
4. Buy each pack with a Stripe test card and confirm exactly 100 or 250 purchased credits are added once.
5. Resend the successful Checkout webhook and confirm the balance does not change again.
6. Refund a purchase and confirm only unspent purchased credits are reclaimed; the balance must never become negative.
7. Confirm editing, saving, and downloading existing documents do not consume credits.

## Legacy subscriptions

Existing Stripe subscription events remain supported during the transition, and affected users retain access to the Stripe Billing Portal. No new subscription Checkout Session can be created by the application. Once all legacy subscriptions are cancelled, the legacy subscription columns, handlers, environment variables, and webhook event subscriptions can be removed in a separate migration.

A successful legacy subscription-cycle invoice grants 200 shared purchased credits (the former 100-resume plus 100-cover-letter entitlement). The existing `stripe_webhook_events` idempotency record ensures a replayed renewal event cannot grant the credits twice.
