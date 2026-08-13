import assert from "node:assert/strict";
import test from "node:test";

import {
    isBackendOwnedHttpFailure,
    normalizeSentryEndpoint,
    safeSentryExtras,
    scrubSentryBreadcrumb,
    scrubSentryEvent,
    shouldCaptureHttpFailure,
} from "../src/lib/sentry/privacy.ts";

test("normalizes dynamic endpoints without retaining query strings", () => {
    assert.equal(
        normalizeSentryEndpoint("/api/v1/jobs/12345678?token=secret"),
        "/api/v1/jobs/:id",
    );
    assert.equal(
        normalizeSentryEndpoint("/drafts/550e8400-e29b-41d4-a716-446655440000"),
        "/drafts/:id",
    );
});

test("drops console breadcrumbs and strips arbitrary breadcrumb messages", () => {
    assert.equal(
        scrubSentryBreadcrumb({category: "console", message: "private resume text"}),
        null,
    );
    assert.deepEqual(
        scrubSentryBreadcrumb({
            category: "fetch",
            message: "private response text",
            data: {
                method: "POST",
                status_code: 500,
                url: "https://example.com/api/v1/jobs/12345678?token=secret",
                response: "private response text",
            },
        }),
        {
            category: "fetch",
            message: undefined,
            data: {
                method: "POST",
                status_code: 500,
                url: "https://example.com",
            },
        },
    );
});

test("captures operational HTTP failures and skips expected client states", () => {
    assert.equal(shouldCaptureHttpFailure(), true);
    assert.equal(shouldCaptureHttpFailure(500), true);
    assert.equal(shouldCaptureHttpFailure("503"), true);
    for (const status of [202, 400, 401, 402, 404, 409, 422, 429]) {
        assert.equal(shouldCaptureHttpFailure(status), false);
    }
});

test("lets Go own status-bearing backend failures", () => {
    assert.equal(isBackendOwnedHttpFailure("/api/v1/jobs/12345678", 500), true);
    assert.equal(isBackendOwnedHttpFailure("/api/v1/jobs/12345678", 404), true);
    assert.equal(isBackendOwnedHttpFailure("/api/generate-resume", 500), false);
    assert.equal(isBackendOwnedHttpFailure("/api/v1/jobs/12345678", 200), false);
});

test("retains only allowlisted scalar extras", () => {
    assert.deepEqual(
        safeSentryExtras({
            upstreamErrorCode: "GENERATION_STORE_ERROR",
            failureCode: "provider_request_failed",
            attemptCount: 2,
            userId: "private-user-id",
            resume: {fullName: "Private Person"},
        }),
        {
            upstreamErrorCode: "GENERATION_STORE_ERROR",
            failureCode: "provider_request_failed",
            attemptCount: 2,
        },
    );
});

test("scrubs request, identity, and high-cardinality paths", () => {
    const event = scrubSentryEvent({
        type: undefined,
        request: {
            url: "https://example.com/api/v1/jobs/12345678?token=secret",
            data: {resume: "private"},
            query_string: "token=secret",
            cookies: {session: "secret"},
            headers: {authorization: "Bearer secret"},
        },
        user: {
            id: "opaque-user-id",
            email: "private@example.com",
            ip_address: "127.0.0.1",
        },
        extra: {
            errorCode: "GENERATION_STORE_ERROR",
            response: "private response",
        },
        contexts: {
            nextjs: {
                request_path: "/api/v1/jobs/12345678?token=secret",
                router_path: "/api/v1/jobs/[jobID]",
                router_kind: "App Router",
                route_type: "route",
                private: "drop me",
            },
        },
        exception: {
            values: [{
                type: "ProviderError",
                value: "user private@example.com request https://provider.example/private?token=secret id 550e8400-e29b-41d4-a716-446655440000",
                mechanism: {type: "generic", data: {response: "private"}},
            }],
        },
    });

    assert.deepEqual(event.request, {
        url: "https://example.com",
        data: undefined,
        query_string: undefined,
        cookies: undefined,
        headers: undefined,
        env: undefined,
    });
    assert.deepEqual(event.user, {id: "opaque-user-id"});
    assert.deepEqual(event.extra, {errorCode: "GENERATION_STORE_ERROR"});
    assert.deepEqual(event.contexts.nextjs, {
        request_path: "/api/v1/jobs/:id",
        router_path: "/api/v1/jobs/[jobID]",
        router_kind: "App Router",
        route_type: "route",
    });
    assert.doesNotMatch(event.exception.values[0].value, /private@example|provider\.example|550e8400/);
    assert.equal(event.exception.values[0].mechanism.data, undefined);
});
