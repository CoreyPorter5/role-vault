import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {
    GenerationBackendError,
    isGenerationBackendContractFailure,
    reserveGeneration,
} from "../src/lib/resume-generation/backend.ts";

const originalFetch = globalThis.fetch;
const originalAPIURL = process.env.API_URL_PREFIX;
const originalSecret = process.env.INTERNAL_API_SECRET;

test("frontend and backend use the same resume generation model", async () => {
    const frontendSource = await readFile(
        new URL("../src/lib/resume-generation/generate.ts", import.meta.url),
        "utf8",
    );
    const backendSource = await readFile(
        new URL("../../backend/internal/handlers/generation_handler.go", import.meta.url),
        "utf8",
    );
    const frontendModel = frontendSource.match(/RESUME_GENERATION_MODEL = "([^"]+)"/)?.[1];
    const backendModel = backendSource.match(/resumeGenerationModel = "([^"]+)"/)?.[1];

    assert.ok(frontendModel, "frontend generation model was not found");
    assert.ok(backendModel, "backend generation model was not found");
    assert.equal(frontendModel, backendModel);
});

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
            resume_category: "technology_product_data",
            profile_version: 1,
            template_version: "technology_product_data_v1",
            usage: {used: 1, limit: 3, remaining: 2, can_generate: true, period_start: "start", period_end: "end"},
        }, {status: 201});
    };

    const result = await reserveGeneration({
        authHeader: "Bearer token",
        generationID: "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329",
        jobID: "123",
        model: "gpt-5-nano",
        resumeCategory: "technology_product_data",
        profileVersion: 1,
        templateVersion: "technology_product_data_v1",
    });

    assert.equal(requests.length, 2);
    assert.equal(result.created, true);
    for (const request of requests) {
        const body = JSON.parse(request.init.body);
        assert.equal(body.generation_id, "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329");
        assert.equal(body.resume_category, "technology_product_data");
        assert.equal(body.profile_version, 1);
        assert.equal(body.template_version, "technology_product_data_v1");
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
            resumeCategory: "technology_product_data",
            profileVersion: 1,
            templateVersion: "technology_product_data_v1",
        }),
        (error) => error instanceof GenerationBackendError &&
            error.status === 402 &&
            error.code === "GENERATION_LIMIT_REACHED" &&
            error.source === "response",
    );
    assert.equal(calls, 1);
});

test("transport failures are distinguishable from backend HTTP responses", async () => {
    process.env.API_URL_PREFIX = "http://backend.test";
    process.env.INTERNAL_API_SECRET = "0123456789abcdef0123456789abcdef";

    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        throw new TypeError("network unavailable");
    };

    await assert.rejects(
        reserveGeneration({
            authHeader: "Bearer token",
            generationID: "2cb5aa56-b8fe-4a96-bce6-f5c3ba039329",
            jobID: "123",
            model: "gpt-5-nano",
            resumeCategory: "technology_product_data",
            profileVersion: 1,
            templateVersion: "technology_product_data_v1",
        }),
        (error) => error instanceof GenerationBackendError &&
            error.status === 503 &&
            error.source === "transport",
    );
    assert.equal(calls, 2);
});

test("only internal INVALID responses are classified as contract failures", () => {
    assert.equal(
        isGenerationBackendContractFailure(
            new GenerationBackendError(400, "INVALID_MODEL", "unsupported", "response"),
        ),
        true,
    );
    assert.equal(
        isGenerationBackendContractFailure(
            new GenerationBackendError(402, "GENERATION_LIMIT_REACHED", "quota", "response"),
        ),
        false,
    );
    assert.equal(
        isGenerationBackendContractFailure(
            new GenerationBackendError(400, "INVALID_MODEL", "unsupported", "local_validation"),
        ),
        false,
    );
});

function restoreEnvironment(name, value) {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}
