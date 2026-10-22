#!/usr/bin/env node
// Writes test/fixtures/css_tokens.json: every colour token and emphasis recipe as Chrome computes
// them from the kit's CSS, per palette and mode. tokens_test.dart checks the Dart tokens against it.
// Build the parity app first (from ui/): npx vite build --config parity/vite.config.ts
// Then: node flutter/tool/generate_css_tokens.mjs
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ui = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? join(ui, '../helium/node_modules/puppeteer-core'))
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const TOKENS = [
  'ground', 'surface', 'surface-soft', 'line', 'ink', 'muted', 'focus', 'primary', 'on-primary',
  'accent', 'success', 'warning', 'danger', 'on-danger', 'control-surface', 'control-border',
  'control-hover', 'control-pressed', 'control-selected', 'glass-fill', 'glass-fill-flat',
  'glass-edge-light', 'glass-edge-low', 'glass-shadow-color', 'glass-glow', 'control-highlight',
  'glass-fill-large', 'glass-shadow-small',
]
const VARIANTS = ['filled', 'tonal', 'elevated', 'outlined', 'text']
const RECIPE = ['fill', 'hover', 'pressed', 'edge', 'ink']

const root = join(ui, 'parity/dist')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' }
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname.slice(1) || 'index.html'
  try {
    const body = await readFile(join(root, path))
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0, '127.0.0.1')

const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const page = await browser.newPage()
const out = {}
for (const palette of ['lab', 'mono'])
  for (const theme of ['light', 'dark']) {
    await page.goto(`http://127.0.0.1:${server.address().port}/?scene=buttons&palette=${palette}&theme=${theme}`, {
      waitUntil: 'networkidle0',
    })
    out[`${palette}-${theme}`] = await page.evaluate(
      (tokens, variants, recipe) => {
        const host = document.querySelector('.lab-app') ?? document.body
        const probe = document.createElement('div')
        host.append(probe)
        const read = (value) => {
          probe.style.color = value
          return getComputedStyle(probe).color
        }
        const result = { tokens: {}, variants: {} }
        for (const name of tokens) result.tokens[name] = read(`var(--lab-${name})`)
        for (const variant of variants) {
          probe.setAttribute('data-surface-variant', variant)
          result.variants[variant] = {}
          for (const part of recipe) result.variants[variant][part] = read(`var(--lab-variant-${part})`)
        }
        probe.remove()
        return result
      },
      TOKENS,
      VARIANTS,
      RECIPE
    )
  }
await browser.close()
server.close()
await writeFile(join(ui, 'flutter/test/fixtures/css_tokens.json'), JSON.stringify(out, null, 1) + '\n')
console.log('css_tokens.json:', Object.keys(out).join(', '))
