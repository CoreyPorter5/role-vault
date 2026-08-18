import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {readLimitedJsonBody} from "../src/lib/http/readLimitedJsonBody.ts";

test("limited JSON reader parses a valid request within the byte limit", async () => {
    const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({jobID: "job-123"}),
    });

    assert.deepEqual(await readLimitedJsonBody(request, 1024), {
        ok: true,
        value: {jobID: "job-123"},
    });
});

test("limited JSON reader rejects a declared oversized body without reading it", async () => {
    const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {"content-length": "2048"},
        body: JSON.stringify({jobID: "job-123"}),
    });

    assert.deepEqual(await readLimitedJsonBody(request, 1024), {
        ok: false,
        reason: "too_large",
    });
    assert.equal(request.bodyUsed, false);
});

test("limited JSON reader enforces the streamed byte limit without content-length", async () => {
    const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({value: "x".repeat(2048)}),
    });
    assert.equal(request.headers.get("content-length"), null);

    assert.deepEqual(await readLimitedJsonBody(request, 1024), {
        ok: false,
        reason: "too_large",
    });
});

test("limited JSON reader rejects malformed JSON", async () => {
    const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: "{not-json}",
    });

    assert.deepEqual(await readLimitedJsonBody(request, 1024), {
        ok: false,
        reason: "invalid_json",
    });
});

test("job classification uses the bounded JSON reader", () => {
    const source = readFileSync(
        new URL("../src/app/api/classify-job/route.ts", import.meta.url),
        "utf8",
    );
    assert.match(source, /readLimitedJsonBody\(/);
    assert.doesNotMatch(source, /request\.json\(/);
});
