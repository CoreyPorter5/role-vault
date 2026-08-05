import assert from "node:assert/strict";
import test from "node:test";

import {createExtensionManifest} from "../src/config/manifest.ts";

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
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://api.seeksync.example/*",
        "https://app.seeksync.example/*",
        "https://au.seek.com/*",
    ]);
    assert.equal(manifest.permissions.includes("activeTab"), false);
    assert.equal(manifest.permissions.includes("scripting"), false);
    assert.equal(manifest.permissions.includes("storage"), false);
});

test("deduplicates matching app and API origins", () => {
    const manifest = createExtensionManifest(
        {
            VITE_API_URL: "https://seeksync.example",
            VITE_WEB_APP_URL: "https://seeksync.example",
        },
        "production",
    );

    assert.deepEqual(manifest.host_permissions, [
        "https://seeksync.example/*",
        "https://au.seek.com/*",
    ]);
});
