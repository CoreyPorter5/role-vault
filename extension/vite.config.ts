import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from "@tailwindcss/vite";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/scripts/content.ts'),
        background: resolve(__dirname, 'src/scripts/background.ts'),
      },
      output: {
        entryFileNames: (assetInfo) => {
          if(assetInfo.name === 'content' || assetInfo.name === 'background'){
            return '[name].js';
          }
          return 'assets/[name]-[hash].js'
        }
      }
    }
  }
})