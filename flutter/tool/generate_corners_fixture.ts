/**
 * Writes flutter/test/fixtures/corners.json from the web kit's corner geometry (clamped continuous
 * corners: brand/geometry.ts), so the Dart twin is tested against the same numbers.
 * Run from ui/: npx tsx flutter/tool/generate_corners_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { cornerExponentFor, cornerShapeParameter, cornerSmoothing, foSuperellipsePath } from '../../src/brand/geometry'

const box = { width: 120, height: 44 }
// The curve across the fade (radius as a share of half the shorter side), plus edge cases.
const curve = [0, 0.25, 0.5, 0.7, 0.75, 0.8, 0.85, 0.875, 0.9, 0.95, 0.99, 1, 1.2, 3].map((fill) => {
  const radius = (fill * Math.min(box.width, box.height)) / 2
  const smoothing = cornerSmoothing(radius, box.width, box.height)
  return { radius, width: box.width, height: box.height, smoothing, k: cornerShapeParameter(smoothing), exponent: cornerExponentFor(radius, box.width, box.height) }
})
const degenerate = [
  [10, 0, 40],
  [10, 40, 0],
  [-4, 40, 40],
  [Infinity, 40, 40],
].map(([radius, width, height]) => ({ radius, width, height, smoothing: cornerSmoothing(radius, width, height) }))

const cases: { name: string; width: number; height: number; radii: number[]; inset: number }[] = [
  { name: 'card 200×100 r30', width: 200, height: 100, radii: [30, 30, 30, 30], inset: 0 },
  { name: 'circle 46×46 r23', width: 46, height: 46, radii: [23, 23, 23, 23], inset: 0 },
  { name: 'near-capsule 120×44 r18 inset 0.5', width: 120, height: 44, radii: [18, 18, 18, 18], inset: 0.5 },
  { name: 'overlap-scaled capsule 80×40 r40', width: 80, height: 40, radii: [40, 40, 40, 40], inset: 0 },
  { name: 'mixed radii 300×60', width: 300, height: 60, radii: [10, 24, 6, 0], inset: 0 },
  { name: 'bubble 44×44 r22', width: 44, height: 44, radii: [22, 22, 22, 22], inset: 0 },
  { name: 'capsule 132×44 r22', width: 132, height: 44, radii: [22, 22, 22, 22], inset: 0 },
  { name: 'card 300×200 r16', width: 300, height: 200, radii: [16, 16, 16, 16], inset: 0 },
]
const paths = cases.map((c) => ({
  ...c,
  path: foSuperellipsePath(c.width, c.height, c.radii.map((r) => ({ x: r, y: r })) as never, c.inset),
}))

writeFileSync(new URL('../test/fixtures/corners.json', import.meta.url), `${JSON.stringify({ curve, degenerate, paths }, null, 1)}\n`)
console.log(`corners.json: ${curve.length} curve points, ${paths.length} paths`)
