#!/usr/bin/env node
/**
 * Before/after table for two bench runs.
 *   node bench/compare.mjs bench/out/<date>-baseline bench/out/<date>-after [--all]
 * A bare label (`baseline`) is looked up as the newest bench/out/*-<label>. Rows whose numbers did
 * not move (< 5 % and < 0.5 ms / 1 frame) are hidden unless --all.
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flatten } from './summarize.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const all = process.argv.includes('--all')
if (args.length !== 2) {
  console.error('usage: node bench/compare.mjs <run a> <run b> [--all]')
  process.exit(2)
}
const resolve = (x) => {
  if (existsSync(x)) return x
  // Run folders are <YYYY-MM-DD>-<label>: match the label exactly ("fixes" must not pick "web-fixes").
  const hit = readdirSync(join(here, 'out')).filter((d) => d.replace(/^\d{4}-\d{2}-\d{2}-/, '') === x).sort().at(-1)
  if (!hit) throw new Error(`no run ${x}`)
  return join(here, 'out', hit)
}
const [a, b] = args.map(resolve)
const A = new Map(flatten(a).rows.map((r) => [r.key, r]))
const B = new Map(flatten(b).rows.map((r) => [r.key, r]))

const IDLE = [['drawFrames', 'frames'], ['rafCallbacks', 'rAF'], ['infinite', 'anims'], ['mainBusyMs', 'main ms'], ['rasterMs', 'raster ms']]
const ACTIVE = [['p50', 'p50'], ['p95', 'p95'], ['max', 'max'], ['over16', '>16'], ['over33', '>33'], ['task', 'task ms'], ['rp95', 'raster p95'], ['rmax', 'raster max']]

const fmt = (x) => (x === null || x === undefined ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(1))
function cell(x, y) {
  if (x == null && y == null) return null
  if (x == null || y == null) return { text: `${fmt(x)} → ${fmt(y)}`, moved: true }
  const d = y - x
  const rel = x === 0 ? (y === 0 ? 0 : Infinity) : d / Math.abs(x)
  const moved = Math.abs(rel) >= 0.05 && Math.abs(d) >= 0.5
  const sign = d > 0 ? '+' : ''
  return { text: `${fmt(x)} → ${fmt(y)}${moved ? ` (${sign}${Number.isFinite(rel) ? `${Math.round(rel * 100)}%` : fmt(d)})` : ''}`, moved }
}

function table(title, fields, rows) {
  const lines = []
  for (const key of rows) {
    const x = A.get(key) ?? {}, y = B.get(key) ?? {}
    const cells = fields.map(([f]) => cell(x[f], y[f]))
    if (!all && !cells.some((c) => c?.moved)) continue
    lines.push([key, ...cells.map((c) => c?.text ?? '–')])
  }
  console.log(`\n## ${title}\n`)
  if (!lines.length) return console.log('(no changes)')
  const head = ['case', ...fields.map(([, h]) => h)]
  console.log(`| ${head.join(' | ')} |`)
  console.log(`|${head.map(() => '---').join('|')}|`)
  for (const l of lines) console.log(`| ${l.join(' | ')} |`)
}

const keys = [...new Set([...A.keys(), ...B.keys()])]
console.log(`# ${a.split('/').at(-1)} → ${b.split('/').at(-1)}`)
console.log('Lower is better everywhere. Web p50/p95/max = rAF frame deltas; Flutter = build ms (raster in its own columns).')
table('Steady state (idle 3 s)', IDLE, keys.filter((k) => (A.get(k) ?? B.get(k)).idle))
table('Interactions', ACTIVE, keys.filter((k) => !(A.get(k) ?? B.get(k)).idle))
