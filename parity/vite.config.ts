import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('../src', import.meta.url))

/** The React side of the parity harness: imports the kit like an app does. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@feeef\.dev\/ui$/, replacement: `${src}/index.ts` },
      { find: /^@feeef\.dev\/ui\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
