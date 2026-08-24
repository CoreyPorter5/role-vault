import assert from "node:assert/strict";
import test from "node:test";

import {createExtensionManifest} from "../src/config/manifest.ts";

const TEST_SENTRY_DSN = "https://public-key@o123.ingest.de.sentry.io/456";
const TEST_AUTH_COOKIE_NAME = "sb-abcdefghijklmnopqrst-auth-token";

test("development manifest uses configured origins and valid icon paths", () => {
    const manifest = createExtensionManifest(
        {
            VITE_WEB_APP_URL: "http://localhost:3000",
            VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
        },
        "development",
    );

    assert.deepEqual(manifest.permissions, ["webNavigation", "cookies"]);
    assert.deepEqual(manifest.host_permissions, [
        "http://localhost:3000/*",
        "https://au.seek.com/*",
    ]);
    assert.deepEqual(
        manifest.content_scripts[0].matches,
        ["https://au.seek.com/*"],
    );
    assert.equal(manifest.icons["48"], "icons/icon48.png");
    assert.equal(manifest.name, "RoleVault – AI Resume & Cover Letter Builder");
    assert.equal(
        manifest.action.default_icon["48"],
        "icons/icon48.png",
    );
});

test("production manifest rejects local deployment origins", () => {
    assert.throws(() =>
        createExtensionManifest(
            {
                VITE_WEB_APP_URL: "http://localhost:3000",
                VITE_SENTRY_DSN: TEST_SENTRY_DSN,
                VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
            },
            "production",
        )
    );
});

test("production manifest has least-privilege remote host access", () => {
    const manifest = createExtensionManifest(
        {
            VITE_WEB_APP_URL: "https://app.rolevault.example/",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
            VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://app.rolevault.example/*",
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
            VITE_WEB_APP_URL: "https://app.rolevault.example/",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
            VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://app.rolevault.example/*",
        "https://au.seek.com/*",
        "https://o123.ingest.de.sentry.io/*",
    ]);
});

test("does not grant direct backend host access", () => {
    const manifest = createExtensionManifest(
        {
            VITE_WEB_APP_URL: "https://rolevault.example",
            VITE_SENTRY_DSN: TEST_SENTRY_DSN,
            VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://rolevault.example/*",
        "https://au.seek.com/*",
        "https://o123.ingest.de.sentry.io/*",
    ]);
});

test("production manifest requires a complete Sentry DSN", () => {
    assert.throws(() =>
        createExtensionManifest(
            {
                VITE_WEB_APP_URL: "https://app.rolevault.example",
                VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
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
                    VITE_WEB_APP_URL: "https://app.rolevault.example",
                    VITE_SENTRY_DSN: `https://public-key@${hostname}/456`,
                    VITE_AUTH_COOKIE_NAME: TEST_AUTH_COOKIE_NAME,
                },
                "production",
            )
        );
    }
});

test("manifest requires a scoped Supabase auth cookie name", () => {
    assert.throws(() =>
        createExtensionManifest(
            {VITE_WEB_APP_URL: "http://localhost:3000"},
            "development",
        )
    );
    assert.throws(() =>
        createExtensionManifest(
            {
                VITE_WEB_APP_URL: "http://localhost:3000",
                VITE_AUTH_COOKIE_NAME: "unscoped-cookie",
            },
            "development",
        )
    );
});
