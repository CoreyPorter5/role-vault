import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {
    getJobClassificationFailureNotice,
    isJobClassificationConfident,
    JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD,
} from "../src/lib/resume-generation/classification-policy.ts";

test("classification confidence accepts the threshold and high-confidence results", () => {
    assert.equal(JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD, 0.72);
    assert.equal(isJobClassificationConfident(0.92), true);
    assert.equal(isJobClassificationConfident(0.72), true);
    assert.equal(isJobClassificationConfident(0.719), false);
});

test("classification failures use messages that match their cause", () => {
    assert.match(getJobClassificationFailureNotice("low_confidence"), /could not confidently identify/i);
    assert.match(getJobClassificationFailureNotice("incomplete_job_listing"), /does not include enough detail/i);
    assert.match(getJobClassificationFailureNotice("classification_failed"), /temporarily unavailable/i);
    assert.match(getJobClassificationFailureNotice("unexpected_failure"), /temporarily unavailable/i);
});

test("frontend and backend use the same classifier version", () => {
    const frontendClassifier = readFileSync(
        new URL("../src/lib/resume-generation/classify-job.ts", import.meta.url),
        "utf8",
    );
    const backendHandler = readFileSync(
        new URL("../../backend/internal/handlers/job_resume_category_handler.go", import.meta.url),
        "utf8",
    );
    const frontendVersion = frontendClassifier.match(/JOB_CLASSIFIER_VERSION = (\d+)/)?.[1];
    const backendVersion = backendHandler.match(/jobClassificationVersion = (\d+)/)?.[1];

    assert.equal(frontendVersion, "3");
    assert.equal(backendVersion, frontendVersion);
});
