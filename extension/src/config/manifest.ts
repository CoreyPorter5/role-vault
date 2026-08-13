import {
    assertProductionOrigin,
    normalizeHTTPOrigin,
    sentryDSNOrigin,
    toChromeHostPattern,
} from "./urls.ts";
import {EXTENSION_VERSION} from "./version.ts";

const SEEK_HOST_PATTERN = "https://au.seek.com/*";

type ManifestEnvironment = {
    VITE_API_URL?: string;
    VITE_WEB_APP_URL?: string;
    VITE_SENTRY_DSN?: string;
};

export function createExtensionManifest(
    environment: ManifestEnvironment,
    mode: string,
) {
    const apiOrigin = normalizeHTTPOrigin(
        environment.VITE_API_URL,
        "VITE_API_URL",
    );
    const webAppOrigin = normalizeHTTPOrigin(
        environment.VITE_WEB_APP_URL,
        "VITE_WEB_APP_URL",
    );

    if (mode === "production") {
        assertProductionOrigin(apiOrigin, "VITE_API_URL");
        assertProductionOrigin(
            webAppOrigin,
            "VITE_WEB_APP_URL",
        );
        if (!environment.VITE_SENTRY_DSN?.trim()) {
            throw new Error("VITE_SENTRY_DSN must be configured for a production extension build.");
        }
    }

    const sentryOrigin = environment.VITE_SENTRY_DSN
        ? sentryDSNOrigin(environment.VITE_SENTRY_DSN)
        : null;
    if (mode === "production" && sentryOrigin) {
        assertProductionOrigin(sentryOrigin, "VITE_SENTRY_DSN");
    }

    const hostPermissions = [
        toChromeHostPattern(apiOrigin),
        toChromeHostPattern(webAppOrigin),
        SEEK_HOST_PATTERN,
        ...(mode === "production" && sentryOrigin
            ? [toChromeHostPattern(sentryOrigin)]
            : []),
    ].filter((value, index, values) =>
        values.indexOf(value) === index
    );

    return {
        manifest_version: 3,
        name: "SeekSync Clipper",
        version: EXTENSION_VERSION,
        description: "Save jobs from SEEK to your dashboard",
        permissions: ["webNavigation"],
        icons: {
            "16": "icons/icon16.png",
            "32": "icons/icon32.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png",
        },
        action: {
            default_popup: "index.html",
            default_icon: {
                "16": "icons/icon16.png",
                "32": "icons/icon32.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png",
            },
        },
        content_scripts: [
            {
                matches: [SEEK_HOST_PATTERN],
                js: ["content.js"],
                css: ["content.css"],
                run_at: "document_idle",
            },
        ],
        host_permissions: hostPermissions,
        background: {
            service_worker: "background.js",
            type: "module",
        },
    };
}
