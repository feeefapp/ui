#!/usr/bin/env node
/**
 * LIGHT-EDGES.md: the kit's glass over the light-edge backgrounds, `edges` layout, presets
 * `regular` (tint 1 + blur + refraction) and `clear` (tint 0, refraction), circular corners so the
 * comparison is about the material, not the corner profile. Headless Chrome at 3x.
 *   node lightedges_kit.mjs <built compare page dir> <out dir>
 * Out: <preset>-<scheme>-<bg>.png (bg tags as tools/capture_all.py lightedges).
 */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/Users/mohamad/Desktop/ideas/feeefapps/feeef.all/helium/node_modules/puppeteer-core')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [root, out] = process.argv.slice(2)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }
const BACKGROUNDS = ['flat-ffffff', 'flat-ebebeb', 'flat-d0d0d0', 'lightphoto', 'lightstripes', 'text', 'flat-808080', 'flat-1a1a1a', 'flat-000000', 'darkphoto', 'photo']

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
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--force-device-scale-factor=3', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 3 })
for (const renderer of ['regular', 'clear'])
  for (const theme of ['light', 'dark'])
    for (const bg of BACKGROUNDS) {
      const file = join(out, `${renderer}-${theme}-${bg}.png`)
      if (existsSync(file)) continue
      const query = new URLSearchParams({ layout: 'edges', bg, theme, renderer, corners: 'round' })
      await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`, { waitUntil: 'networkidle0' })
      await page.waitForSelector('html[data-scene-ready][data-bg-ready]')
      await new Promise((r) => setTimeout(r, 1200))
      await page.screenshot({ path: file })
    }
await browser.close()
server.close()
console.log('captured', out)
