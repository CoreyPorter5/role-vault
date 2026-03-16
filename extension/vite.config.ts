import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // 1. Your React dashboard
        main: resolve(__dirname, 'index.html'),
        // 2. Your newly moved content script
        content: resolve(__dirname, 'src/scripts/content.ts')
      },
      output: {
        // Forces Vite to name the output file exactly 'content.js'
        // without adding random hash numbers to the filename
        entryFileNames: (assetInfo) => {
          return assetInfo.name === 'content' ? 'content.js' : 'assets/[name]-[hash].js';
        }
      }
    }
  }
})