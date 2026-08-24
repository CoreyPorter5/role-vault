import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const demo = readFileSync(
    new URL("../components/Marketing/InteractiveSyncDemo.tsx", import.meta.url),
    "utf8",
);
const homePage = readFileSync(
    new URL("../src/app/(with-header)/page.tsx", import.meta.url),
    "utf8",
);

test("landing page includes the interactive RoleVault sync demonstration", () => {
    assert.match(homePage, /<InteractiveSyncDemo\s*\/>/);
    assert.match(demo, /Sync to RoleVault/);
    assert.match(demo, /Syncing…/);
    assert.match(demo, /\/> Synced/);
    assert.match(demo, /Interactive demonstration only/);
});

test("sync demonstration is fictional and does not embed copied job-board markup", () => {
    assert.match(demo, /Northstar Health/);
    assert.match(demo, /Jane Doe Inc\./);
    assert.doesNotMatch(demo, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(demo, /image-service-cdn\.seek\.com\.au/);
    assert.doesNotMatch(demo, /data-automation=/);
});

test("sync demonstration remains local and exposes accessible progress", () => {
    assert.doesNotMatch(demo, /fetch\s*\(/);
    assert.match(demo, /aria-busy=/);
    assert.match(demo, /aria-live="polite"/);
    assert.match(demo, /No account is created and no job data is saved/);
});

test("sync call to action is animated without changing the completed layout height", () => {
    assert.match(demo, /styles\.syncButtonIdle/);
    assert.match(demo, /min-h-\[116px\]/);
    assert.doesNotMatch(demo, /syncState === "synced" && \(\s*<div className="mt-3 flex flex-wrap gap-2">/);
});
