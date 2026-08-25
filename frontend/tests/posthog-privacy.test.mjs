import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {
    analyticsEvents,
    attributionFromSearch,
    safePathname,
    sanitizeAttributionValue,
} from "../src/lib/analytics/events.ts";

const instrumentation = readFileSync(
    new URL("../src/instrumentation-client.ts", import.meta.url),
    "utf8",
);
const pageTracker = readFileSync(
    new URL("../components/Analytics/AnalyticsPageTracker.tsx", import.meta.url),
    "utf8",
);
const serverAnalytics = readFileSync(
    new URL("../src/lib/analytics/server.ts", import.meta.url),
    "utf8",
);
const privacyPage = readFileSync(
    new URL("../src/app/(with-header)/privacy/page.tsx", import.meta.url),
    "utf8",
);
const oauthAction = readFileSync(
    new URL("../components/Auth/oauth.ts", import.meta.url),
    "utf8",
);
const oauthCallback = readFileSync(
    new URL("../src/app/auth/callback/route.ts", import.meta.url),
    "utf8",
);

test("campaign attribution retains only short, allowlisted UTM fields", () => {
    assert.deepEqual(
        attributionFromSearch("?utm_source=google&utm_medium=cpc&utm_campaign=resume%20tailoring&utm_content=private&email=user@example.com"),
        {
            utm_source: "google",
            utm_medium: "cpc",
            utm_campaign: "resume tailoring",
        },
    );
    assert.equal(sanitizeAttributionValue("  social<script>:campaign  "), "socialscriptcampaign");
    assert.equal(sanitizeAttributionValue("a".repeat(120))?.length, 80);
});

test("page tracking strips queries, fragments, and external URLs", () => {
    assert.equal(safePathname("/register?token=secret#form"), "/register");
    assert.equal(safePathname("https://example.com/private"), "/");
    assert.equal(safePathname(""), "/");
    assert.doesNotMatch(pageTracker, /window\.location\.href/);
    assert.match(pageTracker, /\$current_url:\s*`\$\{window\.location\.origin\}\$\{route\}`/);
});

test("PostHog browser collection is explicit and session replay is disabled", () => {
    for (const setting of [
        /autocapture:\s*false/,
        /capture_pageview:\s*false/,
        /capture_pageleave:\s*false/,
        /disable_session_recording:\s*true/,
        /person_profiles:\s*"identified_only"/,
    ]) {
        assert.match(instrumentation, setting);
    }
    assert.match(pageTracker, /\[data-analytics-section\]/);
    assert.match(pageTracker, /\[data-analytics-cta\], \[data-analytics-chrome-store\]/);
});

test("the analytics contract contains the intended acquisition funnel", () => {
    assert.deepEqual(
        [
            analyticsEvents.registrationCompleted,
            analyticsEvents.extensionAuthenticated,
            "job synced",
            "master resume uploaded",
            "document generated",
            "checkout started",
            "credits purchased",
        ],
        [
            "registration completed",
            "extension authenticated",
            "job synced",
            "master resume uploaded",
            "document generated",
            "checkout started",
            "credits purchased",
        ],
    );
});

test("ordinary Google logins are not counted as completed registrations", () => {
    assert.match(oauthAction, /intent:\s*"login" \| "register" = "login"/);
    assert.match(oauthAction, /intent=\$\{intent\}/);
    assert.match(oauthCallback, /searchParams\.get\('intent'\) === 'register'/);
    assert.match(oauthCallback, /if \(isRegistration\) \{/);
});

test("server analytics is best effort and the privacy page documents its exclusions", () => {
    assert.match(serverAnalytics, /catch\s*\{/);
    assert.match(serverAnalytics, /\$geoip_disable:\s*true/);
    assert.match(privacyPage, /Automatic click capture and session replay are disabled/i);
    assert.match(privacyPage, /do not send resume or cover-letter content, job descriptions, filenames, email addresses, payment identifiers, or full URLs to PostHog/i);
});
