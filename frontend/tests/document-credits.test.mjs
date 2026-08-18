import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Stripe Checkout creates one-time, server-priced credit packs", async () => {
    const checkout = await source("../backend/internal/stripe/checkout.go");
    assert.match(checkout, /CheckoutSessionModePayment/);
    assert.doesNotMatch(checkout, /CheckoutSessionModeSubscription/);
    assert.match(checkout, /STRIPE_DOCUMENT_CREDITS_100_PRICE_ID/);
    assert.match(checkout, /STRIPE_DOCUMENT_CREDITS_250_PRICE_ID/);
    assert.match(checkout, /purchase_id/);
    assert.match(checkout, /PaymentIntentData/);
});

test("document wallet migration is ledgered and defaults to six welcome credits", async () => {
    const migration = await source("../supabase/migrations/20260818090000_document_credit_wallet.sql");
    assert.match(migration, /document_credits_promotional integer not null default 6/);
    assert.match(migration, /create table public\.document_credit_transactions/);
    assert.match(migration, /create table public\.stripe_credit_purchases/);
    assert.match(migration, /purchase_id uuid not null unique/);
    assert.match(migration, /alter table public\.document_credit_transactions enable row level security/);
    assert.match(migration, /revoke all on table public\.document_credit_transactions from public, anon, authenticated/);
});

test("resume and cover-letter generation share the same credit balance", async () => {
    const [resumePanel, coverLetterPanel, accountPage] = await Promise.all([
        source("components/Dashboard/ResumeGenerator/DashboardGenerateResumePopup.tsx"),
        source("components/Dashboard/ResumeGenerator/CoverLetterPanel.tsx"),
        source("src/app/dashboard/account/page.tsx"),
    ]);
    for (const file of [resumePanel, coverLetterPanel, accountPage]) {
        assert.match(file, /\/api\/v1\/usage\/document-credits/);
    }
    assert.doesNotMatch(resumePanel, /usage\/resume-generations/);
    assert.doesNotMatch(coverLetterPanel, /usage\/cover-letter-generations/);
});

test("credit marketing is one-time and never claims a monthly allowance", async () => {
    const [publicPricing, dashboardPricing, billing] = await Promise.all([
        source("src/app/(with-header)/(auth)/pricing/page.tsx"),
        source("components/Dashboard/Upgrade/PricingTierModelComponent.tsx"),
        source("components/Dashboard/Billing/DocumentCreditsBillingComponent.tsx"),
    ]);
    for (const file of [publicPricing, dashboardPricing, billing]) {
        assert.doesNotMatch(file, /per month|each month|monthly allowance/i);
        assert.match(file, /one-time|once/i);
    }
});
