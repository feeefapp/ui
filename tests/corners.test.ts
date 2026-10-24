import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CORNER_SMOOTHING_FADE,
  FO_CORNER_EXPONENT,
  cornerExponentFor,
  cornerSmoothing,
  foContinuousEdge,
  foSuperellipsePath,
  type FoCornerRadii,
} from '../src/brand/geometry.ts'
import { cssCornerRadius, cssCornerShape, trueCornerRadius } from '../src/brand/corner-fit.ts'

const points = (path: string) =>
  [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))

test('the corner follows superellipse(1.5) rather than a circle', () => {
  const shape = points(foContinuousEdge(200, 100, 30))
  const midpoint = shape[17]
  const normalizedX = (midpoint.x - 170) / 30
  const normalizedY = (midpoint.y - 30) / 30
  assert.ok(
    Math.abs(
      Math.abs(normalizedX) ** FO_CORNER_EXPONENT + Math.abs(normalizedY) ** FO_CORNER_EXPONENT - 1
    ) < 0.0001
  )
  assert.ok(Math.abs(normalizedX ** 2 + normalizedY ** 2 - 1) > 0.1)
  assert.deepEqual(shape[0], { x: 30, y: 0 })
  assert.deepEqual(shape.at(-1), shape[0])
})

test('radii scale together when they would overlap a short control', () => {
  const corner = { x: 100, y: 100 }
  const radii: FoCornerRadii = [corner, corner, corner, corner]
  const shape = points(foSuperellipsePath(120, 40, radii))
  assert.deepEqual(shape[0], { x: 20, y: 0 })
  assert.ok(shape.every(({ x, y }) => x >= 0 && x <= 120 && y >= 0 && y <= 40))
})

test('asymmetric elliptical corners retain their axes and inset bounds', () => {
  const radii: FoCornerRadii = [
    { x: 30, y: 10 },
    { x: 12, y: 20 },
    { x: 20, y: 24 },
    { x: 8, y: 12 },
  ]
  const shape = points(foSuperellipsePath(200, 80, radii, 1))
  assert.deepEqual(shape[0], { x: 30, y: 1 })
  assert.deepEqual(shape[1], { x: 188, y: 1 })
  assert.ok(shape.every(({ x, y }) => x >= 1 && x <= 199 && y >= 1 && y <= 79))
})

test('empty dimensions, invalid radii and excessive insets never emit invalid SVG', () => {
  for (const args of [
    [0, 0, 20, 0],
    [40, 20, -1, 0],
    [40, 20, Infinity, 0],
    [40, 20, 20, 100],
  ]) {
    assert.doesNotMatch(
      foContinuousEdge(...(args as [number, number, number, number])),
      /NaN|Infinity/
    )
  }
})

test('smoothing is full up to 0.75 of the full radius and eases to none at it', () => {
  assert.equal(cornerSmoothing(0, 120, 44), 1)
  assert.equal(cornerSmoothing(22 * CORNER_SMOOTHING_FADE, 120, 44), 1)
  assert.equal(cornerSmoothing(22, 120, 44), 0)
  assert.equal(cornerSmoothing(80, 120, 44), 0)
  assert.equal(cornerSmoothing(19.25, 120, 44), 0.5)
  let previous = 1
  for (let r = 16.5; r <= 22; r += 0.1) {
    const s = cornerSmoothing(r, 120, 44)
    assert.ok(s <= previous + 1e-12, 'monotonic')
    previous = s
  }
  assert.equal(cornerExponentFor(16, 300, 200), FO_CORNER_EXPONENT)
  assert.equal(cornerExponentFor(22, 44, 44), 2)
})

test('a 44 × 44 bubble at r 22 is a circle and a 132 × 44 bar a capsule', () => {
  const corner = { x: 22, y: 22 }
  const radii: FoCornerRadii = [corner, corner, corner, corner]
  for (const { x, y } of points(foSuperellipsePath(44, 44, radii)))
    assert.ok(Math.abs(Math.hypot(x - 22, y - 22) - 22) < 0.25)
  for (const { x, y } of points(foSuperellipsePath(132, 44, radii)))
    assert.ok(Math.abs(Math.hypot(x - Math.min(110, Math.max(22, x)), y - 22) - 22) < 0.25)
})

test('a 300 × 200 card at r 16 keeps the full continuous corner', () => {
  const corner = { x: 16, y: 16 }
  const radii: FoCornerRadii = [corner, corner, corner, corner]
  const clamped = points(foSuperellipsePath(300, 200, radii))
  const full = points(foSuperellipsePath(300, 200, radii, 0, FO_CORNER_EXPONENT))
  clamped.forEach((p, i) => assert.ok(Math.hypot(p.x - full[i].x, p.y - full[i].y) < 0.1))
})

test('the circle fallback shrinks only smoothed radii, and maps back', () => {
  assert.equal(cssCornerRadius(22, 132, 44, 0.76), 22)
  assert.ok(Math.abs(cssCornerRadius(16, 300, 200, 0.76) - 12.16) < 1e-9)
  for (const r of [4, 12, 16, 17.5, 19, 20.5, 21.9, 22]) {
    const css = cssCornerRadius(r, 132, 44, 0.76)
    assert.ok(Math.abs(trueCornerRadius(css, 132, 44, 0.76) - r) < 1e-4, `r ${r}`)
  }
  assert.equal(trueCornerRadius(999, 132, 44, 0.76), 999)
  assert.equal(trueCornerRadius(12, 132, 44, 1), 12)
  assert.equal(cssCornerShape(22, 44, 44), 'round')
  assert.equal(cssCornerShape(16, 300, 200), 'superellipse(1.5)')
  assert.equal(cssCornerShape(19.25, 132, 44), 'superellipse(1.25)')
})
