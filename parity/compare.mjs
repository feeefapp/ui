#!/usr/bin/env node
/**
 * React ↔ Flutter parity: renders the same scene in both kits (parity/dist and
 * flutter/example/build/web), captures the stage in headless Chrome at 2x, and diffs the pixels.
 *   node parity/compare.mjs [scene …]   →  parity/out/<case>-{react,flutter,diff}.png + report.json
 * Build first: `npx vite build --config parity/vite.config.ts` and `flutter build web` in
 * flutter/example.
 */
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { extname, join, normalize, relative } from 'node:path'
import { readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/Users/mohamad/Desktop/ideas/feeefapps/feeef.all/helium/node_modules/puppeteer-core')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.svg': 'image/svg+xml' }
function serve(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '')
      try {
        const body = await readFile(join(root, path || 'index.html'))
        res.writeHead(200, { 'content-type': TYPES[extname(path || 'index.html')] ?? 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(404).end()
      }
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// `docs` (or `docs:components/button`) expands to every docs example that has a Dart sibling.
function docsScenes(prefix) {
  const ids = []
  const content = join(here, '../docs/content')
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.dart') && dir.endsWith('/examples'))
        ids.push(relative(content, path).replace('/examples/', '/').replace(/\.dart$/, ''))
    }
  }
  walk(content)
  return ids.filter((id) => id.startsWith(prefix)).map((id) => `docs:${id}`)
}
const ARGS = process.argv.slice(2).flatMap((a) => (a === 'docs' || a.startsWith('docs:') && a.split('/').length < 3 ? docsScenes(a.slice(5)) : [a]))
const SCENES = ARGS.length ? ARGS : ['buttons', 'button-states', 'segmented', 'icons', 'choices', 'sliders', 'fields', 'glass', 'dock', 'popover', 'scroll', 'numbers', 'actions', 'list', 'select', 'carousel', 'tabs', 'stack', 'split', 'scaffold', 'sheet', 'modal', 'text', 'corners']
const VARIANTS = [
  { theme: 'light', palette: 'lab', density: 'comfortable' },
  { theme: 'dark', palette: 'lab', density: 'comfortable' },
  { theme: 'light', palette: 'mono', density: 'comfortable' },
  { theme: 'light', palette: 'lab', density: 'compact' },
  { theme: 'light', palette: 'lab', density: 'thin' },
  { theme: 'light', palette: 'lab', density: 'comfortable', dir: 'rtl' },
]

// PARITY_REACT / PARITY_FLUTTER / PARITY_OUT let parallel runs keep their own builds (docs-check.sh).
const react = await serve(process.env.PARITY_REACT ?? join(here, 'dist'))
const flutter = await serve(process.env.PARITY_FLUTTER ?? join(here, '../flutter/example/build/web'))
const out = process.env.PARITY_OUT ?? join(here, 'out')
await mkdir(out, { recursive: true })
// A long launch timeout: on a loaded machine (parallel Flutter builds) Chrome can take over 30s.
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, timeout: 180_000, protocolTimeout: 600_000, args: ['--force-device-scale-factor=2', '--font-render-hinting=none', '--hide-scrollbars'] })
const page = await browser.newPage()
// PARITY_VH: taller viewports for stages that render a phone or tablet frame.
await page.setViewport({ width: 800, height: Number(process.env.PARITY_VH ?? 700), deviceScaleFactor: 2 })
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])

// Scenes that draw in the top layer (dialogs) are compared over the whole viewport.
const VIEWPORT_SCENES = new Set(['modal', 'sheet'])
const cases = []
for (const scene of SCENES)
  for (const v of VARIANTS) {
    const query = new URLSearchParams({ scene, ...v }).toString()
    const name = `${scene.replace(/[:/]/g, '_')}-${v.theme}-${v.palette}-${v.density}${v.dir ? `-${v.dir}` : ''}`
    await page.goto(`http://127.0.0.1:${react.address().port}/?${query}`, { waitUntil: 'networkidle0' })
    await page.evaluate(() => document.fonts.ready)
    await new Promise((r) => setTimeout(r, 400))
    const box = VIEWPORT_SCENES.has(scene)
      ? { x: 0, y: 0, width: 800, height: 700 }
      : await page.$eval('#stage', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
    await page.screenshot({ path: join(out, `${name}-react.png`), ...(VIEWPORT_SCENES.has(scene) ? {} : { clip: box }) })
    await page.goto(`http://127.0.0.1:${flutter.address().port}/?${query}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('flutter-view, flt-glass-pane', { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1500))
    await page.screenshot({ path: join(out, `${name}-flutter.png`), ...(VIEWPORT_SCENES.has(scene) ? {} : { clip: box }) })
    cases.push({ name, height: Math.round(box.height) })
  }
await browser.close()
react.close()
flutter.close()

const diff = execFileSync('python3', [join(here, 'diff.py'), out, ...cases.map((c) => c.name)], { encoding: 'utf8' })
const results = JSON.parse(diff)
await writeFile(join(out, 'report.json'), JSON.stringify(results, null, 2))
for (const r of results) console.log(`${r.name.padEnd(44)} differing ${(r.differing * 100).toFixed(2).padStart(6)}%   mean Δ ${r.mean.toFixed(2)}`)
