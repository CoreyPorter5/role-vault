// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import {scrubSentryBreadcrumb, scrubSentryEvent} from "@/lib/sentry/privacy";

// Client bundles do not receive VERCEL_ENV automatically. Require an explicit
// public environment so preview builds cannot be mistaken for production just
// because Next compiles them with NODE_ENV=production.
const sentryEnvironment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: sentryEnvironment === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: sentryEnvironment,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
});

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

if (posthogToken && posthogHost) {
    posthog.init(posthogToken, {
        api_host: posthogHost,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        disable_surveys: true,
        secure_cookie: process.env.NODE_ENV === "production",
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
