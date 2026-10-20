import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  scrollEdgeOpacities,
  scrollContentReserve,
  scrollWashPaths,
  scrollRevealDelta,
} from '../src/scroll/metrics.ts'

test('edge washes follow the actual start, middle and end of the content', () => {
  assert.deepEqual(scrollEdgeOpacities(0, 400), { top: 0, bottom: 1 })
  assert.deepEqual(scrollEdgeOpacities(200, 400), { top: 1, bottom: 1 })
  assert.deepEqual(scrollEdgeOpacities(400, 400), { top: 1, bottom: 0 })
  assert.deepEqual(scrollEdgeOpacities(40, 400), { top: 0.5, bottom: 1 })
})
test('underflow has merchant resting fades and browser overscroll cannot invert washes', () => {
  assert.deepEqual(scrollEdgeOpacities(0, 0), { top: 0.28, bottom: 0.48 })
  assert.deepEqual(scrollEdgeOpacities(-120, 400), { top: 0, bottom: 1 })
  assert.deepEqual(scrollEdgeOpacities(900, 400), { top: 1, bottom: 0 })
  assert.deepEqual(scrollEdgeOpacities(Number.NaN, Number.NaN), { top: 0.28, bottom: 0.48 })
})
test('spacers include measured chrome and both edge gaps, with a plain-content fallback', () => {
  assert.equal(scrollContentReserve(52, 12, 24), 76)
  assert.equal(scrollContentReserve(0, 12, 24), 24)
  assert.equal(scrollContentReserve(84, 16, 24), 116)
})
test('pixel wash geometry is seeded, stable and generated independently of scroll position', () => {
  const paths = scrollWashPaths(40, 16)
  assert.deepEqual(paths, scrollWashPaths(40, 16))
  assert.equal(paths.length, 12)
  assert.ok(paths.some(Boolean))
  assert.notDeepEqual(paths, scrollWashPaths(20, 16))
})

test('local reveal clears floating reservations and leaves already visible or oversized rows still', () => {
  assert.equal(scrollRevealDelta(120, 164, 100, 400), 0)
  assert.equal(scrollRevealDelta(70, 114, 100, 400), -30)
  assert.equal(scrollRevealDelta(380, 424, 100, 400), 24)
  assert.equal(scrollRevealDelta(20, 500, 100, 400), 0)
  assert.equal(scrollRevealDelta(220, 260, 100, 400, 'center'), -10)
  assert.equal(scrollRevealDelta(Number.NaN, 260, 100, 400), 0)
})
