#!/usr/bin/env node
/**
 * Captures the kit over the iOS 27 Figma layouts (compare/figma27.ts) at 3x in headless Chrome:
 *   node figma27_kit.mjs web|flutter <built page dir> <out dir>
 * web = the compare page (vite build), flutter = flutter_compare/figma27.dart (figma27_flutter.sh).
 * Out: <layout>-<renderer>-<theme>.png for the passes the reference rows need.
 */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/Users/mohamad/Desktop/ideas/feeefapps/feeef.all/helium/node_modules/puppeteer-core')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [kind, root, out] = process.argv.slice(2)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.svg': 'image/svg+xml' }
// ONLY=buttons: the primary button sheet (compare/main.tsx ButtonsScene), light and dark.
const PASSES = process.env.ONLY === 'buttons' ? [['buttons', 'regular', 'light', 590, 380], ['buttons', 'regular', 'dark', 590, 380]] : [
  ['figma-sheet', 'regular', 'light', 640, 510], ['figma-sheet', 'regular', 'dark', 640, 510], ['figma-sheet', 'clear', 'light', 640, 510],
  ['figma-sizes', 'regular', 'light', 1400, 660], ['figma-sizes', 'regular', 'dark', 1400, 660],
]

const server = await new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '')
    try {
      const body = await readFile(join(root, path || 'index.html'))
      res.writeHead(200, { 'content-type': TYPES[extname(path || 'index.html')] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  s.listen(0, '127.0.0.1', () => resolve(s))
})
await mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
for (const [layout, renderer, theme, width, height] of PASSES) {
  await page.setViewport({ width, height, deviceScaleFactor: 3 })
  const query = new URLSearchParams({ layout, theme, renderer, corners: 'round', ...(process.env.PROFILE ? { profile: process.env.PROFILE } : {}) })
  await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`, { waitUntil: 'networkidle0', timeout: 120000 })
  if (kind === 'web') await page.waitForSelector('html[data-scene-ready][data-bg-ready]', { timeout: 120000 })
  else await page.waitForFunction(() => document.title === 'ready', { timeout: 120000 })
  await new Promise((r) => setTimeout(r, 1500))
  await page.screenshot({ path: join(out, `${layout}-${renderer}-${theme}.png`), clip: { x: 0, y: 0, width, height } })
}
await browser.close()
server.close()
console.log('captured', out)
