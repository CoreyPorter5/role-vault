import assert from "node:assert/strict";
import test from "node:test";

import {
    GenerationBackendError,
    reserveGeneration,
} from "../src/lib/resume-generation/backend.ts";

const originalFetch = globalThis.fetch;
const originalAPIURL = process.env.API_URL_PREFIX;
const originalSecret = process.env.INTERNAL_API_SECRET;

test.afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreEnvironment("API_URL_PREFIX", originalAPIURL);
    restoreEnvironment("INTERNAL_API_SECRET", originalSecret);
});

test("reserve retries a transient backend failure without changing the idempotency key", async () => {
    process.env.API_URL_PREFIX = "http://backend.test";
    process.env.INTERNAL_API_SECRET = "0123456789abcdef0123456789abcdef";

    const requests = [];
    globalThis.fetch = async (url, init) => {
        requests.push({url, init});
        if (requests.length === 1) {
            return Response.json({code: "TEMPORARY", message: "retry"}, {status: 500});
        }
        return Response.json({
            generation_id: "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329",
            job_id: "123",
            status: "reserved",
            created: true,
            attempt_count: 0,
            repair_attempted: false,
            usage: {used: 1, limit: 3, remaining: 2, can_generate: true, period_start: "start", period_end: "end"},
        }, {status: 201});
    };

    const result = await reserveGeneration({
        authHeader: "Bearer token",
        generationID: "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329",
        jobID: "123",
        model: "gpt-5-nano",
    });

    assert.equal(requests.length, 2);
    assert.equal(result.created, true);
    for (const request of requests) {
        const body = JSON.parse(request.init.body);
        assert.equal(body.generation_id, "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329");
        assert.equal(request.init.headers["X-Seek-Sync-Internal-Key"], process.env.INTERNAL_API_SECRET);
    }
});

test("quota errors are returned without retrying", async () => {
    process.env.API_URL_PREFIX = "http://backend.test";
    process.env.INTERNAL_API_SECRET = "0123456789abcdef0123456789abcdef";

    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        return Response.json({
            code: "GENERATION_LIMIT_REACHED",
            message: "Resume generation limit reached",
        }, {status: 402});
    };

    await assert.rejects(
        reserveGeneration({
            authHeader: "Bearer token",
            generationID: "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329",
            jobID: "123",
            model: "gpt-5-nano",
        }),
        (error) => error instanceof GenerationBackendError && error.status === 402 && error.code === "GENERATION_LIMIT_REACHED",
    );
    assert.equal(calls, 1);
});

function restoreEnvironment(name, value) {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}
