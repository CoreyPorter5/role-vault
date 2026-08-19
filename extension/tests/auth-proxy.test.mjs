import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const background = readFileSync(new URL("../src/scripts/background.ts", import.meta.url), "utf8");
const popup = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../src/config/manifest.ts", import.meta.url), "utf8");
const packageJSON = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("extension exchanges operation messages instead of bearer tokens", () => {
    const source = `${background}\n${popup}`;
    assert.match(source, /CHECK_AUTH/);
    assert.match(source, /GET_JOBS/);
    assert.match(source, /DELETE_JOB/);
    assert.match(source, /SYNC_JOB/);
    assert.doesNotMatch(source, /GET_TOKEN|getAuthToken|accessToken|Authorization\s*:|Bearer\s/);
});

test("extension depends only on the web proxy for account data", () => {
    assert.equal(packageJSON.dependencies?.["@supabase/supabase-js"], undefined);
    assert.doesNotMatch(popup, /VITE_SUPABASE|@supabase\/supabase-js/);
    assert.doesNotMatch(manifest, /VITE_API_URL|apiOrigin/);
    assert.match(background, /\/api\/extension\/jobs/);
    assert.match(background, /chrome\.cookies\.getAll/);
    assert.match(manifest, /"cookies"/);
    assert.doesNotMatch(background, /\/api\/v1\/jobs/);
});
