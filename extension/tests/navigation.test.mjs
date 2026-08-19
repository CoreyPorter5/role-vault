import assert from "node:assert/strict";
import test from "node:test";

import {
    extractSeekJobIdFromPath,
    isApplyHrefForJob,
    isSeekJobURL,
} from "../src/utils/seekNavigation.ts";
import {updateSyncButton} from "../src/utils/syncButton.ts";

test("extracts SEEK job IDs only from complete job path segments", () => {
    assert.equal(extractSeekJobIdFromPath("/job/12345678"), "12345678");
    assert.equal(extractSeekJobIdFromPath("/job/12345678/preview"), "12345678");
    assert.equal(extractSeekJobIdFromPath("/job/123abc"), null);
    assert.equal(extractSeekJobIdFromPath("/jobs/12345678"), null);
    assert.equal(extractSeekJobIdFromPath("/job/"), null);
});

test("recognizes only HTTPS Australian SEEK job URLs", () => {
    assert.equal(
        isSeekJobURL("https://au.seek.com/job/12345678?type=standard"),
        true,
    );
    assert.equal(
        isSeekJobURL("https://au.seek.com/jobs?keywords=engineer"),
        false,
    );
    assert.equal(
        isSeekJobURL("https://www.seek.com.au/job/12345678"),
        false,
    );
    assert.equal(
        isSeekJobURL("https://evil.example/job/12345678"),
        false,
    );
    assert.equal(isSeekJobURL("not-a-url"), false);
});

test("matches the rendered Apply link to the current SPA job", () => {
    assert.equal(
        isApplyHrefForJob("/job/12345678/apply", "12345678"),
        true,
    );
    assert.equal(
        isApplyHrefForJob(
            "https://au.seek.com/job/12345678/apply?source=job-page",
            "12345678",
        ),
        true,
    );
    assert.equal(
        isApplyHrefForJob("/job/87654321/apply", "12345678"),
        false,
    );
    assert.equal(
        isApplyHrefForJob(
            "https://evil.example/job/12345678/apply",
            "12345678",
        ),
        false,
    );
    assert.equal(isApplyHrefForJob(null, "12345678"), false);
});

test("initializes a sync button before it is attached to the SEEK page", () => {
    const attributes = new Map();
    const button = {
        textContent: null,
        dataset: {},
        setAttribute(name, value) {
            attributes.set(name, value);
        },
    };

    updateSyncButton(button, "Sync to SeekSync");

    assert.equal(button.textContent, "Sync to SeekSync");
    assert.equal(button.dataset.state, "idle");
    assert.equal(attributes.get("aria-busy"), "false");
});
