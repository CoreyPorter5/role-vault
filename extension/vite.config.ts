import {defineConfig, loadEnv, type Plugin} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "path";
import tailwindcss from "@tailwindcss/vite";
import {createExtensionManifest} from "./src/config/manifest.ts";

function extensionManifestPlugin(
    environment: Record<string, string>,
    mode: string,
): Plugin {
    return {
        name: "seeksync-extension-manifest",
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

export default defineConfig(({mode}) => {
    const environment = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [
            react(),
            tailwindcss(),
            extensionManifestPlugin(environment, mode),
        ],
        build: {
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
