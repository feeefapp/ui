#!/usr/bin/env node
/**
 * Screenshots the kit's control lenses (compare/lens.html, built with vite) over every LENS_CYCLE
 * backdrop at 3x in headless Chrome, as the iOS captures: <out>/<theme>/held<k>.png.
 *   node lens_kit.mjs <built page dir> <out dir> [glass=liquid]
 * tools/measure_lens.py reads them like the iOS frames.
 */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/Users/mohamad/Desktop/ideas/feeefapps/feeef.all/helium/node_modules/puppeteer-core')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [root, out, glass = 'liquid'] = process.argv.slice(2)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = await new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '')
    try {
      const body = await readFile(join(root, path || 'index.html'))
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  s.listen(0, '127.0.0.1', () => resolve(s))
})
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, timeout: 180_000, args: ['--force-device-scale-factor=3', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 3 })
for (const theme of ['light', 'dark']) {
  await mkdir(join(out, theme), { recursive: true })
  for (let k = 0; k < 16; k++) {
    await page.goto(`http://127.0.0.1:${server.address().port}/lens.html?bg=${k}&theme=${theme}&glass=${glass}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('html[data-ready]')
    await new Promise((r) => setTimeout(r, 150))
    await page.screenshot({ path: join(out, theme, `held${k}.png`) })
  }
}
await browser.close()
server.closeAllConnections?.()
server.close()
process.exit(0)
