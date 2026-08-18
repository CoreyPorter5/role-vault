import assert from "node:assert/strict";
import test from "node:test";

import {
    isTrustedExtensionPageSender,
    isTrustedSeekContentSender,
} from "../src/utils/runtimeSender.ts";

const RUNTIME_ID = "abcdefghijklmnopabcdefghijklmnop";

test("accepts only this extension's own pages for privileged popup messages", () => {
    assert.equal(isTrustedExtensionPageSender({
        id: RUNTIME_ID,
        url: `chrome-extension://${RUNTIME_ID}/index.html`,
    }, RUNTIME_ID), true);

    assert.equal(isTrustedExtensionPageSender({
        id: RUNTIME_ID,
        url: "https://au.seek.com/job/12345678",
    }, RUNTIME_ID), false);

    assert.equal(isTrustedExtensionPageSender({
        id: "another-extension",
        url: `chrome-extension://${RUNTIME_ID}/index.html`,
    }, RUNTIME_ID), false);
});

test("accepts SEEK content-script messages only from this extension", () => {
    assert.equal(isTrustedSeekContentSender({
        id: RUNTIME_ID,
        url: "https://au.seek.com/job/12345678?tracking=ignored",
    }, RUNTIME_ID), true);

    assert.equal(isTrustedSeekContentSender({
        id: RUNTIME_ID,
        url: "https://evil.example/job/12345678",
    }, RUNTIME_ID), false);

    assert.equal(isTrustedSeekContentSender({
        id: "another-extension",
        url: "https://au.seek.com/job/12345678",
    }, RUNTIME_ID), false);
});
