#!/usr/bin/env node
/**
 * Web performance bench for the docs site (the kit as consumers see it).
 *
 *   node bench/web.mjs [--label baseline] [--reps 3] [--browsers chrome,firefox]
 *                      [--pages components/glass-container,…] [--no-build] [--headful]
 *
 * Builds the docs once (production React, unminified app code so rAF stacks stay readable) into
 * bench/.build/docs, serves it statically with an SPA fallback, and runs every scenario on every
 * page at 1280×800 DPR 2. Each repetition reloads the page. Medians over repetitions go to
 * bench/out/<date>-<label>/web.json (+ summary.md via bench/summarize.mjs).
 *
 * Scenarios (each only where its target exists on the page):
 *   idle      3 s with nothing moving. No rAF recorder (it would itself force frames); instead
 *             the page's own rAF callbacks, running infinite animations, and in Chrome a trace
 *             (frames drawn, main-thread busy time). Ideally all zero.
 *   scroll    wheel events down the content scroller, then back up.
 *   pointer   2 s of mouse moves across the first glass surface.
 *   menu      open and close the actions-bar "More actions" menu twice.
 *   drag      drag a segmented pill across and back, and a switch thumb across and back.
 *   split     glass-container 01: split into two bubbles, then merge back.
 * Active scenarios record rAF frame deltas (p50/p95/max, frames >19.2 ms ≈ one missed 60 Hz
 * vsync with jitter margin, >33.4 ms), Chrome CDP metric deltas and long tasks, and JS heap.
 */
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const here = fileURLToPath(new URL('.', import.meta.url))
const ui = join(here, '..')
const require = createRequire(import.meta.url)
const puppeteer = require(process.env.PUPPETEER_CORE ?? join(ui, '../helium/node_modules/puppeteer-core'))
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FIREFOX = process.env.FIREFOX ?? '/Applications/Firefox.app/Contents/MacOS/firefox'

// ---- options -------------------------------------------------------------------------------
const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(`--${name}`)
const LABEL = opt('label', 'run')
const REPS = Number(opt('reps', '3'))
const BROWSERS = opt('browsers', 'chrome,firefox').split(',')
const DEFAULT_PAGES = [
  'components/glass-container/examples',
  'components/actions-bar/examples',
  'components/segmented-control/examples',
  'components/toolbar/examples',
  'components/switch/examples',
  'foundations/glass-reflections',
  'guidelines/patterns',
  'get-started/introduction',
]
const PAGES = opt('pages', DEFAULT_PAGES.join(',')).split(',')
const SCENARIOS = opt('scenarios', 'idle,scroll,pointer,menu,drag,split').split(',')
const OUT = opt('out', join(here, 'out', `${new Date().toISOString().slice(0, 10)}-${LABEL}`))
const BUILD = join(here, '.build/docs')
const VIEW = { width: 1280, height: 800, deviceScaleFactor: 2 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(`[web ${new Date().toISOString().slice(11, 19)}]`, ...a)

// ---- build + serve ---------------------------------------------------------------------------
if (!flag('no-build')) {
  log('building docs →', BUILD)
  execFileSync('npx', ['vite', 'build', '--config', 'docs/vite.config.ts', '--outDir', BUILD, '--emptyOutDir', '--minify', 'false', '--logLevel', 'warn'], { cwd: ui, stdio: 'inherit' })
} else await stat(join(BUILD, 'index.html'))

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const server = await new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '')
    // History routing: unknown extension-less paths are the app shell.
    const file = !path || !extname(path) ? 'index.html' : path
    try {
      const body = await readFile(join(BUILD, file))
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  s.listen(0, '127.0.0.1', () => resolve(s))
})
const ORIGIN = `http://127.0.0.1:${server.address().port}`

// ---- in-page instrumentation -----------------------------------------------------------------
// Installed before any app code: counts the page's own rAF callbacks (attributed to the first app
// stack frame that requested them) and offers a rAF frame recorder for active scenarios.
const INSTRUMENT = `(() => {
  const raf = window.requestAnimationFrame.bind(window)
  const state = { counting: false, calls: 0, sites: {}, recorder: null }
  window.__bench = state
  const site = () => {
    const lines = (new Error().stack || '').split('\\n').slice(2)
    const app = lines.filter((l) => l.includes('/assets/')).slice(0, 3)
    return (app.length ? app : lines.slice(0, 1)).map((l) => l.trim().replace(/^at /, '').replace(location.origin + '/assets/', '')).join(' < ') || '?'
  }
  window.requestAnimationFrame = function (cb) {
    if (!state.counting) return raf(cb)
    const where = site()
    return raf((t) => {
      if (state.counting) { state.calls++; state.sites[where] = (state.sites[where] || 0) + 1 }
      cb(t)
    })
  }
  state.startCount = () => { state.calls = 0; state.sites = {}; state.counting = true }
  state.stopCount = () => { state.counting = false; return { calls: state.calls, sites: state.sites } }
  state.startFrames = () => {
    const times = []
    let on = true
    const tick = (t) => { if (!on) return; times.push(t); raf(tick) }
    raf(tick)
    let longTasks = 0
    let po = null
    try { po = new PerformanceObserver((l) => { longTasks += l.getEntries().length }); po.observe({ type: 'longtask' }) } catch {}
    state.recorder = { stop: () => { on = false; po?.disconnect(); return { times, longTasks: po ? longTasks : null } } }
  }
  state.stopFrames = () => state.recorder.stop()
  state.animations = () => document.getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const t = a.effect?.target
      const timing = a.effect?.getComputedTiming?.() || {}
      return {
        name: a.animationName || a.transitionProperty || a.id || a.constructor.name,
        infinite: timing.iterations === Infinity,
        target: t ? (t.tagName.toLowerCase() + (t.className && typeof t.className === 'string' ? '.' + t.className.trim().split(/\\s+/).slice(0, 3).join('.') : '')) : '?',
      }
    })
  state.heap = () => (performance.memory ? performance.memory.usedJSHeapSize : null)
})()`

// ---- stats -----------------------------------------------------------------------------------
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null)
const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}
const round = (x, d = 2) => (typeof x === 'number' ? Math.round(x * 10 ** d) / 10 ** d : x)
function frameStats(times) {
  const d = []
  for (let i = 1; i < times.length; i++) d.push(times[i] - times[i - 1])
  const s = [...d].sort((a, b) => a - b)
  const span = times.length > 1 ? times.at(-1) - times[0] : 0
  return {
    frames: d.length,
    fps: span ? round((d.length / span) * 1000, 1) : null,
    p50: round(pct(s, 50)),
    p95: round(pct(s, 95)),
    max: round(s.at(-1) ?? null),
    over16: d.filter((x) => x > 19.2).length,
    over33: d.filter((x) => x > 33.4).length,
  }
}

// Chrome trace of the idle window: frames drawn, main-frame updates, rAF fires and main-thread busy time.
function traceStats(buffer) {
  const { traceEvents = [] } = JSON.parse(buffer.toString())
  const threads = {}
  for (const e of traceEvents) if (e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args?.name
  const main = new Set(Object.entries(threads).filter(([, n]) => n === 'CrRendererMain').map(([k]) => k))
  const count = (name) => traceEvents.filter((e) => e.name === name && (e.ph === 'X' || e.ph === 'B' || e.ph === 'I' || e.ph === 'i' || e.ph === 'n')).length
  // Top-level main-thread tasks only (RunTask nests nothing else at depth 0 that we count).
  // Top-level RunTask slices only: nested tasks (microtask checkpoints, nested loops) are skipped.
  let busy = 0
  let end = -Infinity
  const tasks = traceEvents.filter((e) => e.name === 'RunTask' && e.ph === 'X' && main.has(`${e.pid}:${e.tid}`)).sort((a, b) => a.ts - b.ts)
  for (const e of tasks) {
    if (e.ts < end) continue
    busy += e.dur || 0
    end = e.ts + (e.dur || 0)
  }
  return {
    drawFrames: count('DrawFrame'),
    mainFrames: count('BeginMainThreadFrame'),
    rafFired: count('FireAnimationFrame'),
    paints: count('Paint'),
    styleRecalcs: count('UpdateLayoutTree'),
    layouts: count('Layout'),
    mainBusyMs: round(busy / 1000),
  }
}
const TRACE_CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing']

// ---- scenario drivers ------------------------------------------------------------------------
async function visibleBox(page, selector, within = '.docs-content') {
  return page.evaluate((selector, within) => {
    const root = document.querySelector(within) || document
    for (const el of root.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect()
      if (r.width > 8 && r.height > 8) {
        el.scrollIntoView({ block: 'center', inline: 'center' })
        const b = el.getBoundingClientRect()
        return { x: b.x, y: b.y, width: b.width, height: b.height }
      }
    }
    return null
  }, selector, within)
}
const GLASS = '.docs-stage :is(.lab-glass-group, .lab-toolbar-group, .lab-glass-container, [data-glass-id], .lab-segmented), .docs-content :is(.lab-glass-group, .lab-glass-container, [class*="glass"])'

const DRIVERS = {
  async scroll(page) {
    const box = await page.evaluate(() => {
      const v = document.querySelector('.lab-workspace-route [data-lab-scroll-viewport], .lab-workspace-route .lab-scroll-viewport') || document.querySelector('.lab-workspace-main')
      const r = v.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    return {
      async prepare() { await page.mouse.move(box.x, box.y) },
      async run() {
        for (let i = 0; i < 30; i++) { await page.mouse.wheel({ deltaY: 120 }); await sleep(16) }
        await sleep(300)
        for (let i = 0; i < 30; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(16) }
        await sleep(300)
      },
    }
  },
  async pointer(page) {
    const box = await visibleBox(page, GLASS)
    if (!box) return null
    return {
      async prepare() { await page.mouse.move(box.x - 20, box.y + box.height / 2) },
      async run() {
        const end = Date.now() + 2000
        let i = 0
        while (Date.now() < end) {
          const t = (i++ % 60) / 60
          const x = box.x - 20 + (box.width + 40) * (t < 0.5 ? t * 2 : 2 - t * 2)
          const y = box.y + box.height * (0.25 + 0.5 * Math.abs(Math.sin(i / 7)))
          await page.mouse.move(x, y)
          await sleep(16)
        }
      },
    }
  },
  async menu(page) {
    const sel = '.docs-example[aria-labelledby="example-06-menus-at-both-ends"] button[aria-label="More actions"]'
    const box = await visibleBox(page, sel)
    if (!box) return null
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2
    return {
      async prepare() { await page.mouse.move(cx, cy) },
      async run() {
        for (let i = 0; i < 2; i++) {
          await page.mouse.click(cx, cy)
          await sleep(700)
          await page.keyboard.press('Escape')
          await sleep(700)
        }
      },
    }
  },
  async drag(page) {
    const seg = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.docs-stage .lab-segmented')].find((e) => e.getBoundingClientRect().width > 40)
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const opts = [...el.querySelectorAll('[role="radio"]')]
      const checked = opts.find((o) => o.getAttribute('aria-checked') === 'true') || opts[0]
      const other = opts.at(checked === opts.at(-1) ? 0 : -1)
      const c = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
      return { from: c(checked), to: c(other) }
    })
    const sw = async () => page.evaluate(() => {
      const el = [...document.querySelectorAll('.docs-stage [role="switch"]')].find((e) => e.getBoundingClientRect().width > 20)
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const host = el.closest('.lab-slider') || el
      const thumb = host.querySelector('.lab-slider-thumb') || host
      const t = thumb.getBoundingClientRect(), h = host.getBoundingClientRect()
      const fromX = t.x + t.width / 2
      const toX = fromX < h.x + h.width / 2 ? h.right - t.width / 2 : h.x + t.width / 2
      return { from: { x: fromX, y: t.y + t.height / 2 }, to: { x: toX, y: t.y + t.height / 2 } }
    })
    const drag = async (from, to) => {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      for (const [a, b] of [[from, to], [to, from]])
        for (let i = 1; i <= 24; i++) { await page.mouse.move(a.x + ((b.x - a.x) * i) / 24, a.y + ((b.y - a.y) * i) / 24); await sleep(16) }
      await page.mouse.up()
      await sleep(400)
    }
    const hasSwitch = await page.$('.docs-stage [role="switch"]')
    if (!seg && !hasSwitch) return null
    return {
      async prepare() {},
      async run() {
        if (seg) await drag(seg.from, seg.to)
        const w = hasSwitch && (await sw())
        if (w) await drag(w.from, w.to)
      },
    }
  },
  async split(page) {
    const apart = await visibleBox(page, '.docs-example[aria-labelledby="example-01-split-merge"] .docs-stage [role="radio"]')
    if (!apart) return null
    const target = async (label) => page.evaluate((label) => {
      const r = [...document.querySelectorAll('.docs-example[aria-labelledby="example-01-split-merge"] .docs-stage [role="radio"]')].find((e) => (e.querySelector('.lab-segmented-label')?.textContent ?? e.textContent).trim().startsWith(label))
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }, label)
    return {
      async prepare() {},
      async run() {
        for (const label of ['Delete on its own', 'One bubble']) {
          const p = await target(label)
          await page.mouse.click(p.x, p.y)
          await sleep(1200)
        }
      },
    }
  },
}

// ---- backdrop-filter rendering probe ---------------------------------------------------------
// Screenshots the same striped box with and without a blurring overlay; identical pixels mean the
// browser (or its automation mode) does not paint backdrop filters.
async function backdropProbe(page) {
  await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.id = '__bench_probe'
    probe.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:120px;z-index:2147483647;background:repeating-linear-gradient(90deg,#000 0 6px,#fff 6px 12px)'
    const glass = document.createElement('div')
    glass.style.cssText = 'position:absolute;inset:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)'
    probe.appendChild(glass)
    document.body.appendChild(probe)
  })
  await sleep(200)
  const clip = { x: 0, y: 0, width: 120, height: 120 }
  const a = await page.screenshot({ clip, encoding: 'base64' })
  await page.evaluate(() => { document.querySelector('#__bench_probe > div').style.display = 'none' })
  await sleep(200)
  const b = await page.screenshot({ clip, encoding: 'base64' })
  const supported = await page.evaluate(() => CSS.supports('backdrop-filter', 'blur(1px)'))
  await page.evaluate(() => document.getElementById('__bench_probe').remove())
  return { cssSupports: supported, painted: a !== b }
}

// ---- run -------------------------------------------------------------------------------------
async function launch(name) {
  const common = { headless: !flag('headful'), timeout: 300_000, protocolTimeout: 900_000 }
  if (name === 'chrome')
    return puppeteer.launch({ ...common, executablePath: CHROME, args: ['--hide-scrollbars', `--window-size=${VIEW.width},${VIEW.height}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] })
  return puppeteer.launch({ ...common, browser: 'firefox', product: 'firefox', protocol: 'webDriverBiDi', executablePath: FIREFOX, extraPrefsFirefox: { 'layout.css.backdrop-filter.enabled': true, 'layout.frame_rate': 60 } })
}

async function runOnce(browser, name, path) {
  const page = await browser.newPage()
  await page.setViewport(VIEW)
  await page.evaluateOnNewDocument(INSTRUMENT)
  await page.goto(`${ORIGIN}/${path}`, { waitUntil: 'load', timeout: 180_000 })
  await page.waitForSelector('.docs-content', { timeout: 120_000 })
  await page.evaluate(() => document.fonts.ready)
  await sleep(2000) // entry animations, lazy highlighter, fonts
  const isChrome = name === 'chrome'
  const results = {}
  for (const scenario of SCENARIOS) {
    // Park the pointer away from content, let the previous scenario settle.
    await page.mouse.move(2, VIEW.height - 2)
    await sleep(800)
    if (scenario === 'idle') {
      const before = isChrome ? await page.metrics() : null
      if (isChrome) await page.tracing.start({ categories: TRACE_CATEGORIES })
      await page.evaluate(() => window.__bench.startCount())
      await sleep(3000)
      const raf = await page.evaluate(() => window.__bench.stopCount())
      const trace = isChrome ? traceStats(await page.tracing.stop()) : null
      const after = isChrome ? await page.metrics() : null
      const animations = await page.evaluate(() => window.__bench.animations())
      results.idle = {
        rafCallbacks: raf.calls,
        rafSites: Object.entries(raf.sites).sort((a, b) => b[1] - a[1]).slice(0, 6),
        runningAnimations: animations.length,
        infiniteAnimations: animations.filter((a) => a.infinite),
        trace,
        cdp: isChrome ? cdpDelta(before, after) : null,
        heap: await page.evaluate(() => window.__bench.heap()),
      }
      continue
    }
    const driver = await DRIVERS[scenario](page)
    if (!driver) continue
    await driver.prepare()
    await sleep(300)
    const before = isChrome ? await page.metrics() : null
    await page.evaluate(() => window.__bench.startFrames())
    await driver.run()
    const { times, longTasks } = await page.evaluate(() => window.__bench.stopFrames())
    const after = isChrome ? await page.metrics() : null
    results[scenario] = { ...frameStats(times), longTasks, cdp: isChrome ? cdpDelta(before, after) : null, heap: await page.evaluate(() => window.__bench.heap()) }
  }
  await page.close()
  return results
}

function cdpDelta(a, b) {
  const ms = (k) => round(((b[k] ?? 0) - (a[k] ?? 0)) * 1000, 1)
  return { script: ms('ScriptDuration'), layout: ms('LayoutDuration'), style: ms('RecalcStyleDuration'), task: ms('TaskDuration'), layouts: (b.LayoutCount ?? 0) - (a.LayoutCount ?? 0), styles: (b.RecalcStyleCount ?? 0) - (a.RecalcStyleCount ?? 0), heap: b.JSHeapUsedSize ?? null }
}

// Median of every numeric leaf across repetitions; non-numeric leaves come from the first rep.
function mergeReps(reps) {
  const merge = (vals) => {
    const first = vals.find((v) => v !== undefined && v !== null)
    if (typeof first === 'number') return round(median(vals))
    if (Array.isArray(first) || first === undefined || first === null) return first ?? null
    if (typeof first === 'object') {
      const out = {}
      for (const k of new Set(vals.flatMap((v) => (v && typeof v === 'object' ? Object.keys(v) : [])))) out[k] = merge(vals.map((v) => v?.[k]))
      return out
    }
    return first
  }
  return merge(reps)
}

await mkdir(OUT, { recursive: true })
const report = {
  label: LABEL,
  date: new Date().toISOString(),
  machine: { cpus: os.cpus().length, model: os.cpus()[0]?.model, loadavg: os.loadavg().map((x) => round(x, 1)), platform: `${os.platform()} ${os.release()}` },
  viewport: VIEW,
  reps: REPS,
  note: 'Docs build with unminified app code. Frame metrics are medians over reps. over16 = frames > 19.2 ms (missed a 60 Hz vsync, with jitter margin).',
  browsers: {},
}
for (const name of BROWSERS) {
  log(`launching ${name}`)
  let browser
  try {
    browser = await launch(name)
  } catch (error) {
    log(`${name} failed to launch: ${error.message}`)
    report.browsers[name] = { error: String(error.message) }
    continue
  }
  const entry = { version: await browser.version(), pages: {} }
  {
    const page = await browser.newPage()
    await page.setViewport(VIEW)
    await page.goto(`${ORIGIN}/get-started/introduction`, { waitUntil: 'load', timeout: 180_000 })
    entry.backdropFilter = await backdropProbe(page).catch((e) => ({ error: e.message }))
    await page.close()
  }
  if (name === 'firefox' && !entry.backdropFilter?.painted)
    entry.warning = 'Backdrop filters are not painted in this automation mode: Firefox numbers measure main-thread work only, not glass compositing.'
  for (const path of PAGES) {
    const reps = []
    for (let r = 0; r < REPS; r++) {
      log(`${name} ${path} rep ${r + 1}/${REPS}`)
      try {
        reps.push(await runOnce(browser, name, path))
      } catch (error) {
        log(`  failed: ${error.message}`)
      }
    }
    entry.pages[path] = reps.length ? { ...mergeReps(reps), repsOk: reps.length } : { error: 'all reps failed' }
    await writeFile(join(OUT, 'web.json'), JSON.stringify({ ...report, browsers: { ...report.browsers, [name]: entry } }, null, 2))
  }
  report.browsers[name] = entry
  await browser.close().catch(() => {})
}
server.close()
await writeFile(join(OUT, 'web.json'), JSON.stringify(report, null, 2))
log('wrote', join(OUT, 'web.json'))
execFileSync(process.execPath, [join(here, 'summarize.mjs'), OUT], { stdio: 'inherit' })
