/**
 * Writes flutter/test/fixtures/containers.json from the web kit's container models (carousel,
 * adaptive), so the Dart twins are tested against the same numbers.
 * Run from ui/: npx tsx flutter/tool/generate_containers_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { centeredIndex, flickTarget, slideEffect, slideProgress } from '../../src/containers/carousel-model'
import { pickFitting } from '../../src/containers/adaptive-model'

const progress = [
  [120, 200, 300],
  [500, 200, 300],
  [200, 200, 300],
  [-40, 160, 0],
  [37.5, 10, 262.4],
  [-100, 200, 312],
].map(([slideCenter, trackCenter, step]) => ({
  slideCenter,
  trackCenter,
  step,
  value: slideProgress(slideCenter, trackCenter, step),
}))

const centered = [[0], [-1.2, -0.2, 0.8], [0.5, -0.5], [2, 1, 0.4, -0.6], [-0.3, 0.3, 1.3]].map((p) => ({
  progress: p,
  index: centeredIndex(p),
}))

const offsets = [0, 300, 600, 900, 1200, 1500, 1800, 2100]
const flicks = [
  [0, 0, 0],
  [140, 0, 0],
  [160, 0, 0],
  [310, 800, 1],
  [310, -800, 1],
  [300, 4000, 1],
  [300, 20000, 1],
  [2100, 3000, 7],
  [900, -20000, 3],
  [450, 150, 1],
].map(([scroll, velocity, current]) => ({
  scroll,
  velocity,
  current,
  maxSkip: 3,
  target: flickTarget(scroll, velocity, offsets, current),
}))
const flicksSkip = [
  [300, 20000, 1, 1],
  [300, 20000, 1, 6],
].map(([scroll, velocity, current, maxSkip]) => ({
  scroll,
  velocity,
  current,
  maxSkip,
  target: flickTarget(scroll, velocity, offsets, current, maxSkip),
}))

const scaleOf = (transform: string) => {
  const m = /scale\(([-\d.e]+)\)/.exec(transform)
  return m ? Number(m[1]) : 1
}
const effects = (['none', 'scale', 'fade', 'parallax'] as const).flatMap((effect) =>
  [0, 0.25, -0.5, 1, -1, 1.4, 2.5].map((p) => {
    const fx = slideEffect(effect, p)
    return { effect, progress: p, scale: scaleOf(fx.transform), opacity: fx.opacity }
  })
)

const fitting = [
  [[300, 200, 100], 320],
  [[300, 200, 100], 300],
  [[300, 200, 100], 299.6],
  [[300, 200, 100], 299.4],
  [[300, 200, 100], 150],
  [[300, 200, 100], 40],
  [[], 100],
  [[80], 10],
].map(([widths, available]) => ({ widths, available, index: pickFitting(widths as number[], available as number) }))

writeFileSync(
  new URL('../test/fixtures/containers.json', import.meta.url),
  JSON.stringify({ offsets, progress, centered, flicks: [...flicks, ...flicksSkip], effects, fitting }, null, 2) + '\n'
)
