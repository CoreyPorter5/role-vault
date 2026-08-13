import assert from "node:assert/strict";
import test from "node:test";

import {createExtensionManifest} from "../src/config/manifest.ts";

const TEST_SENTRY_DSN = "https://public-key@o123.ingest.de.sentry.io/456";

test("development manifest uses configured origins and valid icon paths", () => {
    const manifest = createExtensionManifest(
        {
            VITE_API_URL: "http://localhost:8080",
            VITE_WEB_APP_URL: "http://localhost:3000",
        },
        "development",
    );

    assert.deepEqual(manifest.permissions, ["webNavigation"]);
    assert.deepEqual(manifest.host_permissions, [
        "http://localhost:8080/*",
        "http://localhost:3000/*",
        "https://au.seek.com/*",
    ]);
    assert.deepEqual(
        manifest.content_scripts[0].matches,
        ["https://au.seek.com/*"],
    );
    assert.equal(manifest.icons["48"], "icons/icon48.png");
    assert.equal(
        manifest.action.default_icon["48"],
        "icons/icon48.png",
    );
});

test("production manifest rejects local deployment origins", () => {
    assert.throws(() =>
        createExtensionManifest(
            {
                VITE_API_URL: "http://localhost:8080",
                VITE_WEB_APP_URL: "http://localhost:3000",
                VITE_SENTRY_DSN: TEST_SENTRY_DSN,
            },
            "production",
        )
    );
});

test("production manifest has least-privilege remote host access", () => {
    const manifest = createExtensionManifest(
        {
            VITE_API_URL: "https://api.seeksync.example/",
            VITE_WEB_APP_URL: "https://app.seeksync.example/",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://api.seeksync.example/*",
        "https://app.seeksync.example/*",
        "https://au.seek.com/*",
        "https://o123.ingest.de.sentry.io/*",
    ]);
    assert.equal(manifest.permissions.includes("activeTab"), false);
    assert.equal(manifest.permissions.includes("scripting"), false);
    assert.equal(manifest.permissions.includes("storage"), false);
});

test("production manifest grants only the configured Sentry ingest origin", () => {
    const manifest = createExtensionManifest(
        {
            VITE_API_URL: "https://api.seeksync.example/",
            VITE_WEB_APP_URL: "https://app.seeksync.example/",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://api.seeksync.example/*",
        "https://app.seeksync.example/*",
        "https://au.seek.com/*",
        "https://o123.ingest.de.sentry.io/*",
    ]);
});

test("deduplicates matching app and API origins", () => {
    const manifest = createExtensionManifest(
        {
            VITE_API_URL: "https://seeksync.example",
            VITE_WEB_APP_URL: "https://seeksync.example",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://seeksync.example/*",
        "https://au.seek.com/*",
        "https://o123.ingest.de.sentry.io/*",
    ]);
});

test("production manifest requires a complete Sentry DSN", () => {
    assert.throws(() =>
        createExtensionManifest(
            {
                VITE_API_URL: "https://api.seeksync.example",
                VITE_WEB_APP_URL: "https://app.seeksync.example",
            },
            "production",
        )
    );
});

test("production manifest rejects local Sentry ingest origins", () => {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
        assert.throws(() =>
            createExtensionManifest(
                {
                    VITE_API_URL: "https://api.seeksync.example",
                    VITE_WEB_APP_URL: "https://app.seeksync.example",
                    VITE_SENTRY_DSN: `https://public-key@${hostname}/456`,
                },
                "production",
            )
        );
    }
});
