import assert from "node:assert/strict";
import test from "node:test";

import { safeStripeRedirectUrl } from "../src/lib/stripe/redirect.ts";

test("accepts Stripe-hosted checkout and billing URLs", () => {
  assert.equal(
    safeStripeRedirectUrl("https://checkout.stripe.com/c/pay/cs_test_123#token"),
    "https://checkout.stripe.com/c/pay/cs_test_123#token",
  );
  assert.equal(
    safeStripeRedirectUrl("https://billing.stripe.com/p/session/test"),
    "https://billing.stripe.com/p/session/test",
  );
});

test("rejects non-HTTPS, lookalike, relative and non-string targets", () => {
  for (const value of [
    "http://checkout.stripe.com/c/pay/test",
    "https://checkout.stripe.com:8443/c/pay/test",
    "https://checkout.stripe.com.evil.example/test",
    "https://stripe.com/test",
    "/dashboard",
    "javascript:alert(1)",
    null,
    42,
  ]) {
    assert.equal(safeStripeRedirectUrl(value), null);
  }
});
