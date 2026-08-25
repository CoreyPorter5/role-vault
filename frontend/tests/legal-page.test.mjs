import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const privacyPage = readFileSync(
    new URL("../src/app/(with-header)/privacy/page.tsx", import.meta.url),
    "utf8",
);
const homePage = readFileSync(
    new URL("../src/app/(with-header)/page.tsx", import.meta.url),
    "utf8",
);

test("privacy page includes the SEEK independence disclaimer", () => {
    assert.match(privacyPage, /not affiliated with, endorsed by, sponsored by, approved by, or operated by SEEK Limited/i);
    assert.match(privacyPage, /SEEK and its associated names, logos, and trade marks belong to their respective owners/i);
    assert.match(homePage, /Independent product\. Not affiliated with SEEK\./);
});

test("privacy page covers the product's material data flows", () => {
    for (const disclosure of [
        "Chrome extension",
        "AI processing",
        "cover-letter",
        "Supabase",
        "OpenAI",
        "Stripe",
        "Sentry",
        "PostHog",
        "Overseas processing",
        "Access, correction, deletion, and control",
    ]) {
        assert.match(privacyPage, new RegExp(disclosure, "i"));
    }
});

test("privacy page exposes a configurable monitored contact and the homepage links to it", () => {
    assert.match(privacyPage, /NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL/);
    assert.match(privacyPage, /Office of the Australian Information Commissioner/);
    assert.match(homePage, /href="\/privacy"/);
});
