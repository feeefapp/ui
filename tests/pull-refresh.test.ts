import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PULL_REFRESH,
  pullDistance,
  pullLoaderTop,
  pullProgress,
  pullRelease,
} from '../src/scroll/pull-refresh-model.ts'

// The same vectors are checked by flutter/test/scroll_test.dart.
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`)

test('a pull follows the finger with rubber-band resistance', () => {
  assert.equal(pullDistance(0, 700), 0)
  assert.equal(pullDistance(-20, 700), 0)
  close(pullDistance(100, 700), 50.99337748344366)
  close(pullDistance(130, 700), 64.87362281270254)
  // Resistance grows: twice the travel moves the content less than twice as far.
  assert.ok(pullDistance(260, 700) < pullDistance(130, 700) * 2)
  assert.ok(pullDistance(10000, 700) < 700)
})

test('reduced motion follows at half speed, without the rubber band, capped', () => {
  assert.equal(pullDistance(100, 700, true), 50)
  assert.equal(pullDistance(1000, 700, true), PULL_REFRESH.threshold * 1.5)
})

test('release refreshes past the threshold and holds the loader open', () => {
  assert.deepEqual(pullRelease(63.9), { refresh: false, target: 0 })
  assert.deepEqual(pullRelease(64), { refresh: true, target: PULL_REFRESH.hold })
  assert.equal(pullProgress(32), 0.5)
  assert.equal(pullProgress(200), 1)
  assert.equal(pullProgress(-5), 0)
  assert.equal(pullLoaderTop(PULL_REFRESH.hold), 16)
  assert.equal(pullLoaderTop(0), -10)
})
