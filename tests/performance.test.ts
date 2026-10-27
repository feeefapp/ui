import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MEASURE, measuredPerformance, resolvePerformance, slowWindow } from '../src/performance.ts'
import { THEME_DEFAULTS } from '../src/theme-config.ts'

test('auto keeps the full look on capable devices', () => {
  assert.equal(resolvePerformance('auto', {}), 'balanced')
  assert.equal(resolvePerformance('auto', { cores: 8, memoryGb: 8 }), 'balanced')
  // Safari reports 4 cores on phones that run the full look well.
  assert.equal(resolvePerformance('auto', { cores: 4 }), 'balanced')
})

test('auto steps down on weak devices', () => {
  assert.equal(resolvePerformance('auto', { memoryGb: 2 }), 'light')
  assert.equal(resolvePerformance('auto', { cores: 2 }), 'light')
  assert.equal(resolvePerformance('auto', { cores: 16, memoryGb: 8, softwareGpu: true }), 'light')
  assert.equal(resolvePerformance('auto', { cores: 16, memoryGb: 8 }, true), 'light')
})

test('an app setting wins over the device', () => {
  assert.equal(resolvePerformance('full', { memoryGb: 1, softwareGpu: true }, true), 'full')
  assert.equal(resolvePerformance('light', { cores: 16 }), 'light')
  assert.equal(THEME_DEFAULTS.performance, 'auto')
})

test('a window is slow when its median frame misses 25 per second', () => {
  const frames = (ms: number, n = MEASURE.minFrames) => Array.from({ length: n }, () => ms)
  assert.equal(slowWindow(frames(16.7)), false)
  assert.equal(slowWindow(frames(60)), true)
  assert.equal(slowWindow(frames(60, MEASURE.minFrames - 1)), null)
  // A few long frames (a page transition) are not slowness.
  assert.equal(slowWindow([...frames(200, 5), ...frames(16.7)]), false)
})

test('two slow windows in a row mark the device slow; a fast one starts over', () => {
  const slow = Array.from({ length: 30 }, () => 80)
  const fast = Array.from({ length: 30 }, () => 16.7)
  let changes = 0
  const stop = measuredPerformance.subscribe(() => changes++)
  try {
    measuredPerformance.report(slow)
    measuredPerformance.report(fast)
    measuredPerformance.report(slow)
    assert.equal(measuredPerformance.slow, false)
    measuredPerformance.report(slow)
    assert.equal(measuredPerformance.slow, true)
    assert.equal(changes, 1)
  } finally {
    measuredPerformance.forget()
    stop()
  }
  assert.equal(measuredPerformance.slow, false)
})
