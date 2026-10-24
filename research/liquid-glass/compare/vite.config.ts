import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * The comparison page. KIT=before resolves the kit from a snapshot of a previous build
 * (KIT_DIST=<path to its dist/>) instead of src/, to measure before/after.
 */
// KIT_SRC=<dir> builds from a snapshot of src/ (stable while src/ is being edited).
const kit = process.env.KIT === 'before' ? process.env.KIT_DIST! : (process.env.KIT_SRC ?? fileURLToPath(new URL('../../../src', import.meta.url)))
const ext = process.env.KIT === 'before' ? '.js' : ''
const index = process.env.KIT === 'before' ? 'index.js' : 'index.ts'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@feeef\.dev\/ui\/(provider|scaffold)$/, replacement: `${kit}/$1${ext}` },
      { find: /^@feeef\.dev\/ui\/glass$/, replacement: `${kit}/glass/${index}` },
      { find: /^@feeef\.dev\/ui\/primitives\/(.*)$/, replacement: `${kit}/primitives/$1${ext}` },
    ],
  },
  build: { outDir: process.env.OUT_DIR ?? 'dist', emptyOutDir: true },
})
