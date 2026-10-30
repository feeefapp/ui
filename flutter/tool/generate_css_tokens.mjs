#!/usr/bin/env node
// Writes test/fixtures/css_tokens.json: every colour token and emphasis recipe as Chrome computes
// them from the kit's CSS, per palette and mode, and test/fixtures/css_sizes.json: every size token
// per density. tokens_test.dart checks the Dart tokens against both.
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
  'accent', 'success', 'warning', 'danger', 'on-danger', 'badge', 'on-badge', 'control-surface', 'control-border',
  'control-hover', 'control-pressed', 'control-selected', 'glass-fill',
  'glass-edge-light', 'glass-edge-low', 'glass-shadow-color', 'glass-glow', 'control-highlight',
  'glass-fill-large', 'focus-ring-color',
]
// Size tokens (px) per density; SizeTokens getters in tokens_test.dart.
const SIZES = [
  'control-small', 'control-height', 'control-large',
  'control-padding-small', 'control-padding', 'control-padding-large',
  'control-font-small', 'control-font', 'control-font-large',
  'field-height-small', 'field-height', 'row-height', 'menu-row-height',
  'toolbar-item', 'toolbar-control', 'toolbar-gap', 'toolbar-inset',
  'segmented-inset', 'switch-width', 'switch-height',
  'thumb-width', 'thumb-height', 'slider-track',
  'list-row-height', 'list-radius', 'list-inset',
  'focus-ring-width', 'focus-ring-offset', 'radius-control', 'radius-control-small',
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
        // The glass tint the colours were computed at (the default), so Dart resolves at the same one.
        result.glassTint = parseFloat(getComputedStyle(host).getPropertyValue('--lab-glass-tint'))
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
const sizes = {}
for (const density of ['comfortable', 'compact', 'thin']) {
  await page.goto(`http://127.0.0.1:${server.address().port}/?scene=buttons&density=${density}`, {
    waitUntil: 'networkidle0',
  })
  sizes[density] = await page.evaluate((names) => {
    const host = document.querySelector('.lab-app') ?? document.body
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    host.append(probe)
    const result = {}
    for (const name of names) {
      probe.style.width = `var(--lab-${name})`
      result[name] = parseFloat(getComputedStyle(probe).width)
    }
    probe.remove()
    return result
  }, SIZES)
}
await browser.close()
server.close()
await writeFile(join(ui, 'flutter/test/fixtures/css_tokens.json'), JSON.stringify(out, null, 1) + '\n')
await writeFile(join(ui, 'flutter/test/fixtures/css_sizes.json'), JSON.stringify(sizes, null, 1) + '\n')
console.log('css_tokens.json:', Object.keys(out).join(', '), '· css_sizes.json:', Object.keys(sizes).join(', '))
