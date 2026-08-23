import {defineConfig, loadEnv, type Plugin} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "path";
import tailwindcss from "@tailwindcss/vite";
import {sentryVitePlugin} from "@sentry/vite-plugin";
import {createExtensionManifest} from "./src/config/manifest.ts";
import {EXTENSION_VERSION} from "./src/config/version.ts";

function extensionManifestPlugin(
    environment: Record<string, string>,
    mode: string,
): Plugin {
    return {
        name: "rolevault-extension-manifest",
        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: "manifest.json",
                source: JSON.stringify(
                    createExtensionManifest(environment, mode),
                    null,
                    2,
                ),
            });
        },
    };
}

function requiredBuildValue(
    environment: Record<string, string>,
    key: string,
): string {
    const value = environment[key]?.trim();
    if (!value) {
        throw new Error(`${key} must be configured for production source-map upload. Set SENTRY_SKIP_SOURCE_MAP_UPLOAD=1 only for a local verification build.`);
    }
    return value;
}

export default defineConfig(({mode}) => {
    const environment = loadEnv(mode, process.cwd(), "");
    const production = mode === "production";
    const skipSourceMapUpload = environment.SENTRY_SKIP_SOURCE_MAP_UPLOAD === "1";
    const sentryRelease = environment.VITE_SENTRY_RELEASE?.trim() ||
        `rolevault-extension@${EXTENSION_VERSION}`;
    const sentryBuild = production && !skipSourceMapUpload
        ? {
            authToken: requiredBuildValue(environment, "SENTRY_AUTH_TOKEN"),
            org: requiredBuildValue(environment, "SENTRY_ORG"),
            project: requiredBuildValue(environment, "SENTRY_PROJECT"),
        }
        : null;

    return {
        plugins: [
            react(),
            tailwindcss(),
            extensionManifestPlugin(environment, mode),
            ...(sentryBuild ? [sentryVitePlugin({
                ...sentryBuild,
                telemetry: false,
                release: {
                    name: sentryRelease,
                    inject: true,
                },
                sourcemaps: {
                    assets: "./dist/**/*.{js,map}",
                    filesToDeleteAfterUpload: ["./dist/**/*.map"],
                },
                bundleSizeOptimizations: {
                    excludeDebugStatements: true,
                    excludeTracing: true,
                },
            })] : []),
        ],
        build: {
            modulePreload: false,
            sourcemap: sentryBuild ? "hidden" : false,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, "index.html"),
                    background: resolve(
                        __dirname,
                        "src/scripts/background.ts",
                    ),
                },
                output: {
                    entryFileNames: (assetInfo) => {
                        if (assetInfo.name === "background") {
                            return "background.js";
                        }

                        return "assets/[name]-[hash].js";
                    },
                },
            },
        },
    };
});
