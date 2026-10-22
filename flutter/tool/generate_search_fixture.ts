/**
 * Writes flutter/test/fixtures/search.json from the web kit's search capsule motion, so the Dart
 * twin (lib/toolbar_search_motion.dart) is tested against the same numbers.
 * Run from ui/: npx tsx flutter/tool/generate_search_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { stepSearchMorph, searchMorphVisibility } from '../../src/toolbar-search-motion'

// The same progress the component computes before painting.
const progressOf = (position: number, compact: number, wide: number) =>
  Math.min(1, Math.max(0, (position - compact) / Math.max(1, wide - compact)))
const settled = (s: { position: number; velocity: number }, target: number) =>
  Math.abs(s.position - target) < 0.15 && Math.abs(s.velocity) < 0.6

const runs = [
  { compact: 46, wide: 400, from: 46, to: 400, dt: 1 / 60 },
  { compact: 46, wide: 400, from: 400, to: 46, dt: 1 / 60 },
  { compact: 50, wide: 320.5, from: 50, to: 320.5, dt: 1 / 120 },
  { compact: 46, wide: 46, from: 46, to: 46, dt: 1 / 60 },
  { compact: 36, wide: 600, from: 36, to: 600, dt: 0.1 },
  { compact: 46, wide: 400, from: 200, to: 46, dt: 1 / 30, velocity: 900 },
].map((run) => {
  let state = { position: run.from, velocity: run.velocity ?? 0 }
  const frames: { position: number; velocity: number; progress: number; editor: number; controls: number; settled: boolean }[] = []
  for (let i = 0; i < 90; i++) {
    state = stepSearchMorph(state, run.to, run.dt)
    const progress = progressOf(state.position, run.compact, run.wide)
    const visibility = searchMorphVisibility(progress)
    frames.push({ ...state, progress, ...visibility, settled: settled(state, run.to) })
  }
  return { ...run, velocity: run.velocity ?? 0, frames }
})

const elapsed = [-1, 0, 0.001, 1 / 120, 0.02, 0.04, 0.5, 10].map((dt) => ({
  dt,
  state: stepSearchMorph({ position: 10, velocity: -30 }, 250, dt),
}))

const visibility = [-0.5, 0, 0.05, 0.06, 0.12, 0.2, 0.25, 0.3, 0.475, 0.5, 0.7, 0.9, 1, 1.5].map(
  (progress) => ({ progress, ...searchMorphVisibility(progress) })
)

const progress = [
  [46, 46, 400],
  [223, 46, 400],
  [500, 46, 400],
  [10, 46, 400],
  [46.5, 46, 46.4],
  [47, 46, 46],
].map(([position, compact, wide]) => ({
  position,
  compact,
  wide,
  value: progressOf(position, compact, wide),
}))

writeFileSync(
  new URL('../test/fixtures/search.json', import.meta.url),
  JSON.stringify({ runs, elapsed, visibility, progress }, null, 1) + '\n'
)
console.log('wrote flutter/test/fixtures/search.json')
