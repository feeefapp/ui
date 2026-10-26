/**
 * Writes flutter/test/fixtures/image.json from the web kit's image studio maths, so the Dart twins
 * are tested against the same numbers. Run from ui/:
 * npx tsx flutter/tool/generate_image_fixture.ts
 *
 * - image/board-utils.ts: stageRatio, elapsed, takeErrorText.
 * - image/freeform-frame.ts: sideInset, revealCovered.
 * - image/freeform-board.tsx: layoutCards, fitView.
 */
import { register } from 'node:module'
import { writeFileSync } from 'node:fs'

// freeform-board.tsx imports stylesheets; Node can't load CSS, so stub it.
register(
  'data:text/javascript,' +
    encodeURIComponent(
      `export async function load(url, context, next) {
        if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
        return next(url, context)
      }`
    )
)

const { stageRatio, elapsed, takeErrorText } = await import('../../src/image/board-utils')
const { sideInset, revealCovered } = await import('../../src/image/freeform-frame')
const { layoutCards, fitView } = await import('../../src/image/freeform-board')

// Deterministic pseudo-random numbers (mulberry32).
let seed = 0x9e3779b9
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (a: number, b: number) => a + (b - a) * random()

const ratioInputs = [
  { aspectRatio: '1:1' },
  { aspectRatio: '4:5' },
  { aspectRatio: '16:9' },
  { aspectRatio: '2:3' },
  { size: '1024x1536' },
  { size: '1536x1024' },
  { aspectRatio: '0:1' },
  { aspectRatio: 'wide' },
  { aspectRatio: '3:2:1' },
  { aspectRatio: ' 3 : 4 ' },
  { aspectRatio: '1.5:1' },
  { aspectRatio: '-4:5' },
  { aspectRatio: ':5' },
  {},
  { aspectRatio: '4:5', size: '1024x1024' },
]
const stage = ratioInputs.map((options) => ({ options, ratio: stageRatio(undefined, options) }))

const base = Date.parse('2026-10-22T08:00:00.000Z')
const elapsedCases = [0, 400, 499, 500, 1499, 1500, 59_400, 59_500, 60_000, 61_000, 125_400, 3_600_000, -5000, 7_199_999].map(
  (offset) => ({ from: new Date(base).toISOString(), now: base + offset, text: elapsed(new Date(base).toISOString(), base + offset) })
)

const known: Record<string, string> = { 'lab.board.err_image_missing': 'No picture came back.' }
const t = (key: string) => known[key] ?? key
const errorCases = [
  { error: 'Boom', errorCode: 'image_missing' },
  { error: 'Boom', errorCode: 'unknown_code' },
  { error: null, errorCode: 'unknown_code' },
  { error: '', errorCode: null },
  { error: 'Plain error', errorCode: null },
  { error: null, errorCode: '' },
  { error: null },
].map((take) => ({ take, text: takeErrorText(take, t, 'Fallback') }))

const insetCases: unknown[] = []
for (let i = 0; i < 80; i++) {
  const viewportW = i % 17 === 0 ? 0 : Math.round(between(320, 1600))
  const width = i % 13 === 0 ? 0 : between(120, viewportW * 0.9 + 1)
  const left = between(-40, viewportW)
  const rect = i % 19 === 0 ? null : { left, right: left + width, width, height: i % 11 === 0 ? 0 : between(50, 900) }
  const open = i % 9 !== 0
  for (const side of ['left', 'right'] as const) {
    const gap = i % 3 === 0 ? 8 : between(0, 20)
    insetCases.push({ open, rect, viewportW, side, gap, inset: sideInset(open, rect, viewportW, side, gap) })
  }
}

const revealCases: unknown[] = []
for (let i = 0; i < 60; i++) {
  const cards: { x: number; w: number }[] = []
  let x = 0
  const count = 1 + Math.floor(random() * 6)
  for (let c = 0; c < count; c++) {
    const w = Math.round(between(140, 2240))
    cards.push({ x, w })
    x += w + 72
  }
  const focus = cards[Math.floor(random() * cards.length)]
  const view = { x: between(-2000, 800), y: between(-300, 300), scale: i % 23 === 0 ? 0 : between(0.08, 1.4) }
  const viewport = { w: Math.round(between(360, 1600)) }
  const insets = { left: Math.round(between(0, 400)), right: Math.round(between(0, 400)) }
  const padding = i % 4 === 0 ? 28 : between(0, 40)
  revealCases.push({
    view,
    cards,
    focus: cards.indexOf(focus),
    viewport,
    insets,
    padding,
    result: revealCovered(view, cards, focus, viewport, insets, padding),
  })
}

const take = (id: string, options: Record<string, string>) => ({ id, options })
const layoutCases = [
  { takes: [], ratios: {} },
  { takes: [take('a', { aspectRatio: '1:1' })], ratios: {} },
  {
    takes: [take('c', { aspectRatio: '1:1' }), take('b', { aspectRatio: '4:5' }), take('a', { aspectRatio: '16:9' })],
    ratios: {},
  },
  {
    takes: [take('c', { aspectRatio: '1:1' }), take('b', { size: '1024x1536' }), take('a', { aspectRatio: '9:1' })],
    ratios: { b: 0.7333, c: 0.1 },
  },
  { takes: [take('x', { aspectRatio: '3:7' }), take('y', { aspectRatio: '1:9' })], ratios: { x: 1.0009 } },
].map(({ takes, ratios }) => ({
  takes,
  ratios,
  cards: layoutCards(takes as never, ratios).map((card) => ({
    id: card.take.id,
    x: card.x,
    y: card.y,
    w: card.w,
    h: card.h,
    number: card.number,
  })),
}))

const fitCases: unknown[] = []
for (let i = 0; i < 60; i++) {
  const rect = { x: between(-2000, 4000), y: between(-600, 0), w: between(10, 3000), h: between(10, 1200) }
  const viewport = { w: between(100, 1800), h: between(100, 1200) }
  const insets = { top: between(0, 200), right: between(0, 400), bottom: between(0, 300), left: between(0, 400) }
  const padding = i % 3 === 0 ? 28 : between(0, 60)
  const maxScale = i % 4 === 0 ? 1 : between(0.01, 6)
  fitCases.push({ rect, viewport, insets, padding, maxScale, view: fitView(rect, viewport, insets, padding, maxScale) })
}

writeFileSync(
  new URL('../test/fixtures/image.json', import.meta.url),
  JSON.stringify({ stage, elapsed: elapsedCases, errors: errorCases, insets: insetCases, reveal: revealCases, layout: layoutCases, fit: fitCases }, null, 1)
)
console.log('wrote flutter/test/fixtures/image.json')
