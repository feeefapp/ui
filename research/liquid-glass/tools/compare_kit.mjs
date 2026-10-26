#!/usr/bin/env node
/**
 * Renders the kit's glass over the LGLab backgrounds (compare/ page, built with vite) in headless
 * Chrome at 3x, one screenshot per reference scene, for compare_kit.py to diff against the iOS
 * captures.  node compare_kit.mjs <built page dir> <out dir> [renderer ...]
 */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/Users/mohamad/Desktop/ideas/feeefapps/feeef.all/helium/node_modules/puppeteer-core')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [root, out, ...renderers] = process.argv.slice(2)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }

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
const backgrounds = ['photo', 'stripes12', 'flat-808080', 'flat-ffffff', 'flat-1a1a1a']
for (const renderer of renderers.length ? renderers : ['css', 'canvas'])
  for (const theme of ['light', 'dark'])
    for (const bg of backgrounds) {
      const query = new URLSearchParams({ layout: 'shapes-a', bg, theme, renderer })
      await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`, { waitUntil: 'networkidle0' })
      await page.waitForSelector('html[data-scene-ready][data-bg-ready]')
      await new Promise((r) => setTimeout(r, 1200))
      await page.screenshot({ path: join(out, `${renderer}-${theme}-${bg}.png`) })
    }
await browser.close()
server.close()
console.log('captured', out)
