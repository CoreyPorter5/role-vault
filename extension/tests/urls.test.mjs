import assert from "node:assert/strict";
import test from "node:test";

import {
    assertProductionOrigin,
    normalizeHTTPOrigin,
    sentryDSNOrigin,
    toChromeHostPattern,
} from "../src/config/urls.ts";

test("normalizes configured origins", () => {
    assert.equal(
        normalizeHTTPOrigin(
            " https://app.seeksync.example/ ",
            "WEB_URL",
        ),
        "https://app.seeksync.example",
    );
    assert.equal(
        normalizeHTTPOrigin(
            "http://localhost:8080",
            "API_URL",
        ),
        "http://localhost:8080",
    );
});

test("rejects unsafe or ambiguous configured URLs", () => {
    for (const value of [
        undefined,
        "not-a-url",
        "ftp://api.example.com",
        "https://user:password@api.example.com",
        "https://api.example.com/v1",
        "https://api.example.com?region=au",
        "https://api.example.com/#fragment",
    ]) {
        assert.throws(
            () => normalizeHTTPOrigin(value, "API_URL"),
        );
    }
});

test("production origins must be remote HTTPS origins", () => {
    assert.doesNotThrow(() =>
        assertProductionOrigin(
            "https://api.seeksync.example",
            "API_URL",
        )
    );

    for (const origin of [
        "http://api.seeksync.example",
        "http://localhost:8080",
        "https://localhost:8080",
        "https://127.0.0.1:8080",
    ]) {
        assert.throws(() =>
            assertProductionOrigin(origin, "API_URL")
        );
    }
});

test("creates a Chrome origin match pattern", () => {
    assert.equal(
        toChromeHostPattern("https://api.seeksync.example"),
        "https://api.seeksync.example/*",
    );
});

test("validates a complete public Sentry DSN", () => {
    assert.equal(
        sentryDSNOrigin("https://public-key@o123.ingest.de.sentry.io/456"),
        "https://o123.ingest.de.sentry.io",
    );
    for (const dsn of [
        "https://o123.ingest.de.sentry.io/456",
        "https://public-key@o123.ingest.de.sentry.io/",
        "https://public-key:secret@o123.ingest.de.sentry.io/456",
        "https://public-key@o123.ingest.de.sentry.io/not-a-project",
    ]) {
        assert.throws(() => sentryDSNOrigin(dsn));
    }
});
