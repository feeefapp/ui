import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GLASS_MAX_SIDE, glassMemberRect } from '../src/glass/member-bounds.ts'

const container = { width: 600, height: 60 }
const viewport = { width: 1280, height: 800 }

test('glass members keep their rect when they fit the container', () => {
  assert.deepEqual(glassMemberRect({ x: 8, y: 8, width: 120, height: 44 }, container, viewport, 32), { x: 8, y: 8, width: 120, height: 44 })
})

test('broken or absurd members are not glass', () => {
  for (const rect of [
    { x: 0, y: 0, width: Number.NaN, height: 44 },
    { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 44 },
    { x: 0, y: 0, width: 0, height: 44 },
    // An error box overflowing a toolbar search by 200,000 px.
    { x: 0, y: 0, width: 300, height: 200_000 },
    { x: 0, y: 0, width: GLASS_MAX_SIDE + 1, height: 44 },
    // Longer than four times the larger of container and viewport.
    { x: 0, y: 0, width: 1280 * 4 + 1, height: 44 },
  ])
    assert.equal(glassMemberRect(rect, container, viewport, 32), null)
  // A huge container never raises the absolute limit.
  assert.equal(glassMemberRect({ x: 0, y: 0, width: 9000, height: 40 }, { width: 200_000, height: 40 }, viewport, 32), null)
})

test('glass is clamped to the container grown by the viewport (or the margin, if larger)', () => {
  // A bubble scrolled partly out of its row keeps its exact shape.
  assert.deepEqual(glassMemberRect({ x: -100, y: -10, width: 900, height: 200 }, container, viewport, 32), { x: -100, y: -10, width: 900, height: 200 })
  assert.deepEqual(glassMemberRect({ x: -2000, y: 0, width: 4000, height: 44 }, container, viewport, 32), { x: -1280, y: 0, width: 3160, height: 44 })
  assert.deepEqual(glassMemberRect({ x: -1000, y: 0, width: 2000, height: 44 }, container, { width: 10, height: 10 }, 32), { x: -32, y: 0, width: 664, height: 44 })
  assert.equal(glassMemberRect({ x: 2000, y: 0, width: 50, height: 44 }, container, viewport, 32), null, 'wholly outside the reach')
})
