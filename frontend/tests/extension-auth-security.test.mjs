import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {
    chromeExtensionOrigin,
    isAllowedExtensionPreflight,
    isAllowedExtensionRequest,
} from "../src/lib/extension/request-policy.ts";

const extensionID = "a".repeat(32);
const extensionOrigin = `chrome-extension://${extensionID}`;

test("extension request policy requires the configured origin and extension header", () => {
    assert.equal(chromeExtensionOrigin(extensionID), extensionOrigin);
    assert.equal(chromeExtensionOrigin("public-but-not-an-extension-id"), null);
    assert.equal(isAllowedExtensionRequest({
        configuredExtensionID: extensionID,
        requestOrigin: extensionOrigin,
        suppliedExtensionID: extensionID,
    }), true);
    assert.equal(isAllowedExtensionRequest({
        configuredExtensionID: extensionID,
        requestOrigin: "https://malicious.example",
        suppliedExtensionID: extensionID,
    }), false);
    assert.equal(isAllowedExtensionRequest({
        configuredExtensionID: extensionID,
        requestOrigin: extensionOrigin,
        suppliedExtensionID: "b".repeat(32),
    }), false);
    assert.equal(isAllowedExtensionPreflight({
        configuredExtensionID: extensionID,
        requestOrigin: extensionOrigin,
    }), true);
    assert.equal(isAllowedExtensionPreflight({
        configuredExtensionID: extensionID,
        requestOrigin: null,
    }), false);
});

test("extension session response cannot disclose a Supabase bearer token", () => {
    const sessionRoute = readFileSync(
        new URL("../src/app/api/extension/session/route.ts", import.meta.url),
        "utf8",
    );
    assert.match(sessionRoute, /authenticated:\s*true/);
    assert.match(sessionRoute, /firstName:/);
    assert.doesNotMatch(sessionRoute, /accessToken|access_token|expiresAt|Bearer/);
});

test("extension job proxy authenticates, bounds input, and keeps the backend token server-side", () => {
    const jobsRoute = readFileSync(
        new URL("../src/app/api/extension/jobs/route.ts", import.meta.url),
        "utf8",
    );
    const deleteRoute = readFileSync(
        new URL("../src/app/api/extension/jobs/[jobID]/route.ts", import.meta.url),
        "utf8",
    );
    for (const source of [jobsRoute, deleteRoute]) {
        assert.match(source, /rejectUntrustedExtensionRequest\(/);
        assert.match(source, /getAuthenticatedExtensionSession\(/);
        assert.match(source, /fetchExtensionBackend\(/);
    }
    assert.match(jobsRoute, /readLimitedJsonBody\(/);
    assert.match(jobsRoute, /z\.strictObject\(/);
    assert.doesNotMatch(jobsRoute, /session\.access_token/);
});

test("extension sources use operation-specific web routes and contain no token bridge", () => {
    const sources = [
        "../../extension/src/App.tsx",
        "../../extension/src/scripts/background.ts",
        "../../extension/src/config/manifest.ts",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

    assert.match(sources, /\/api\/extension\/jobs/);
    assert.doesNotMatch(sources, /GET_TOKEN|getAuthToken|accessToken|VITE_SUPABASE|@supabase\/supabase-js/);
    assert.doesNotMatch(sources, /\/api\/v1\/jobs|Authorization\s*:|Bearer\s/);
});
