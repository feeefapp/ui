/**
 * Writes flutter/test/fixtures/glass.json from the web kit's glass geometry and light, so the Dart
 * twin is tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_glass_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import {
  shapeDistance,
  smoothMin,
  unionDistance,
  rectGap,
  glassClusters,
  unionLoops,
  loopArea,
  clampRadius,
  type GlassShape,
} from '../../src/glass/geometry'
import { glassLightToward, rimGradient, DEFAULT_GLASS_LIGHT } from '../../src/glass/light'

const pill: GlassShape = { x: 10, y: 20, width: 120, height: 46, radius: 23 }
const square: GlassShape = { x: 0, y: 0, width: 40, height: 40, radius: 12 }
const points: [number, number][] = [
  [0, 0], [10, 20], [70, 43], [130, 43], [140, 43], [12, 22], [128, 64], [70, 10], [5, 50], [140, 70],
]
const pairs: { a: GlassShape; b: GlassShape; spacing: number }[] = [
  { a: { x: 0, y: 0, width: 80, height: 44, radius: 22 }, b: { x: 86, y: 0, width: 44, height: 44, radius: 22 }, spacing: 12 },
  { a: { x: 0, y: 0, width: 80, height: 44, radius: 22 }, b: { x: 100, y: 0, width: 44, height: 44, radius: 22 }, spacing: 12 },
  { a: { x: 0, y: 0, width: 60, height: 60, radius: 20 }, b: { x: 50, y: 30, width: 60, height: 60, radius: 20 }, spacing: 8 },
]
const fixture = {
  distance: [pill, square].map((shape) => ({
    shape,
    clamped: clampRadius(shape),
    samples: points.map(([x, y]) => [x, y, shapeDistance(x, y, shape)]),
  })),
  smoothMin: [[1, 2, 4], [1, 9, 4], [-3, -2.5, 8], [0, 0, 6], [5, 1, 0]].map(([a, b, k]) => [a, b, k, smoothMin(a, b, k)]),
  union: pairs.map(({ a, b, spacing }) => ({
    a,
    b,
    spacing,
    gap: rectGap(a, b),
    clusters: glassClusters([a, b], spacing).length,
    samples: points.map(([x, y]) => [x, y, unionDistance(x, y, [a, b], spacing)]),
    loops: unionLoops([a, b], spacing, 2).map((loop) => ({ points: loop.length, area: loopArea(loop), first: loop[0] })),
  })),
  light: [
    { centre: { x: 100, y: 100 }, pointer: null },
    { centre: { x: 100, y: 100 }, pointer: { x: 400, y: 100 } },
    { centre: { x: 100, y: 100 }, pointer: { x: 100, y: 101 } },
    { centre: { x: 0, y: 0 }, pointer: { x: -50, y: 300 } },
  ].map(({ centre, pointer }) => ({ centre, pointer, light: glassLightToward(centre, pointer) })),
  rim: [
    { bounds: { x: 0, y: 0, width: 200, height: 46 }, light: DEFAULT_GLASS_LIGHT },
    { bounds: { x: 10, y: 5, width: 50, height: 120 }, light: { x: 0.6, y: -0.8 } },
  ].map(({ bounds, light }) => ({ bounds, light, gradient: rimGradient(bounds, light) })),
}
writeFileSync(new URL('../test/fixtures/glass.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n')
console.log('wrote glass.json')
