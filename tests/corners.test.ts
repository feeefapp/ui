import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FO_CORNER_EXPONENT,
  foContinuousEdge,
  foSuperellipsePath,
  type FoCornerRadii,
} from '../src/brand/geometry.ts'

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
