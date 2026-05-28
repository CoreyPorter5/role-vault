import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/scripts/background.ts"),
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
});