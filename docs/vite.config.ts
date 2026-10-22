import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { apiPlugin } from './plugins/api'

const src = fileURLToPath(new URL('../src', import.meta.url))

/** Docs import the kit exactly like consumers do; `@feeef.dev/ui/*` resolves to `src/`. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), apiPlugin(src)],
  resolve: {
    alias: [
      { find: /^@feeef\.dev\/ui$/, replacement: `${src}/index.ts` },
      { find: /^@feeef\.dev\/ui\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
  // The highlighter loads these lazily; pre-bundling them avoids a dev-server full reload the first
  // time a page needs one (src/blocks/code.tsx).
  optimizeDeps: {
    include: [
      'shiki/core',
      'shiki/engine/javascript',
      'shiki/themes/github-light.mjs',
      'shiki/themes/github-dark.mjs',
      'shiki/langs/tsx.mjs',
      'shiki/langs/bash.mjs',
      'shiki/langs/css.mjs',
      'shiki/langs/json.mjs',
      'shiki/langs/html.mjs',
    ],
  },
  server: { port: 4180 },
  preview: { port: 4180 },
  build: { outDir: 'dist', emptyOutDir: true },
})
