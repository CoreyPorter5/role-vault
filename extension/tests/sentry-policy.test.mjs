import assert from "node:assert/strict";
import test from "node:test";

import {
    isIgnoredExtensionError,
    normalizeExtensionEndpoint,
    safeExtensionException,
    scrubExtensionEvent,
    shouldCaptureExtensionHTTPFailure,
    shouldIgnoreExtensionError,
} from "../lib/sentry/privacy.ts";

test("extension HTTP policy ignores expected states", () => {
    for (const status of [401, 404, 409, 429]) {
        assert.equal(shouldCaptureExtensionHTTPFailure(status), false);
    }
    assert.equal(shouldCaptureExtensionHTTPFailure(500), true);
    assert.equal(shouldCaptureExtensionHTTPFailure(0), true);
    assert.equal(shouldCaptureExtensionHTTPFailure(422, true), true);
});

test("extension lifecycle races are ignored", () => {
    assert.equal(
        isIgnoredExtensionError(new Error("Extension context invalidated.")),
        true,
    );
    assert.equal(
        isIgnoredExtensionError(new Error("Could not establish connection. Receiving end does not exist.")),
        true,
    );
    assert.equal(isIgnoredExtensionError(new Error("database unavailable")), false);
    assert.equal(
        shouldIgnoreExtensionError(
            "EXT_POPUP_RUNTIME_MESSAGE",
            new Error("Extension context invalidated."),
        ),
        true,
    );
    assert.equal(
        shouldIgnoreExtensionError(
            "EXT_BG_UNHANDLED",
            new Error("Extension context invalidated."),
        ),
        false,
    );
});

test("extension exceptions retain stack location without raw messages", () => {
    const original = new TypeError("private job data https://example.com/job/123?token=secret");
    original.stack = "TypeError: private job data\n    at syncJob (chrome-extension://id/background.js?private=yes:1:2)";
    const safe = safeExtensionException(original, "Job sync failed");

    assert.equal(safe.name, "TypeError");
    assert.equal(safe.message, "Job sync failed");
    assert.doesNotMatch(safe.stack ?? "", /private job data|private=yes|token=secret/);
    assert.match(safe.stack ?? "", /background\.js/);
});

test("extension events do not retain user or request data", () => {
    const event = scrubExtensionEvent({
        request: {
            url: "https://api.example.com/api/v1/jobs/12345678?token=secret",
            data: {jobDescription: "private"},
            headers: {authorization: "Bearer secret"},
            query_string: "token=secret",
        },
        user: {id: "private-user"},
        extra: {jobId: "12345678"},
    });

    assert.equal(event.request?.url, "https://api.example.com");
    assert.equal(event.request?.data, undefined);
    assert.equal(event.request?.headers, undefined);
    assert.equal(event.user, undefined);
    assert.equal(event.extra, undefined);
    assert.equal(
        normalizeExtensionEndpoint("/api/v1/jobs/12345678?secret=yes"),
        "/api/v1/jobs/:id",
    );
});
