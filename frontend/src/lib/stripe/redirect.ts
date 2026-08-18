const STRIPE_REDIRECT_HOSTS = new Set([
  "checkout.stripe.com",
  "billing.stripe.com",
]);

export function safeStripeRedirectUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port !== "" || !STRIPE_REDIRECT_HOSTS.has(url.hostname)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}
