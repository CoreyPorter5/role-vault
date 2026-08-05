import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    publicDir: false,
    build: {
        emptyOutDir: false,
        outDir: "dist",
        lib: {
            entry: resolve(__dirname, "src/scripts/content.ts"),
            formats: ["iife"],
            name: "SeekSyncContentScript",
            fileName: () => "content.js",
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});
