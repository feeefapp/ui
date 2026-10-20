import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sliderRange,
  sliderValue,
  sliderFraction,
  sliderPointer,
  sliderKey,
} from '../src/primitives/slider-core.ts'

test('slider sanitizes degenerate ranges and clamps external values', () => {
  assert.deepEqual(sliderRange(10, 2, 0), { min: 10, max: 10, step: 1 })
  assert.deepEqual(sliderRange(NaN, Infinity, -1), { min: 0, max: 0, step: 1 })
  assert.equal(sliderValue(-20, -10, 10, 1), -10)
  assert.equal(sliderValue(50, -10, 10, 1), 10)
  assert.equal(sliderValue(NaN, -10, 10, 1), -10)
  assert.equal(sliderFraction(10, 10, 10), 0)
})
test('decimal steps avoid floating artifacts and preserve off-grid endpoint', () => {
  assert.equal(sliderValue(0.26, 0, 1, 0.1), 0.3)
  assert.equal(sliderValue(0.34, 0.05, 1, 0.1), 0.35)
  assert.equal(sliderValue(9.8, 0, 10, 3), 10)
  assert.equal(sliderKey('ArrowLeft', 10, 0, 10, 3, false), 9)
})
test('pointer geometry centers endpoints on the thumb in both directions', () => {
  assert.equal(sliderPointer(122, 100, 244, false), 0)
  assert.equal(sliderPointer(322, 100, 244, false), 1)
  assert.equal(sliderPointer(222, 100, 244, false), 0.5)
  assert.equal(sliderPointer(122, 100, 244, true), 1)
  assert.equal(sliderPointer(322, 100, 244, true), 0)
  assert.equal(sliderPointer(-100, 100, 244, false), 0)
  assert.equal(sliderPointer(900, 100, 244, false), 1)
  assert.ok(Number.isFinite(sliderPointer(0, 0, 0, false)))
})
test('arrows, page jumps and endpoints share the same snapping rules', () => {
  assert.equal(sliderKey('ArrowRight', 50, 0, 100, 5, false), 55)
  assert.equal(sliderKey('ArrowRight', 50, 0, 100, 5, true), 45)
  assert.equal(sliderKey('ArrowUp', 50, 0, 100, 5, true), 55)
  assert.equal(sliderKey('PageDown', 20, 0, 100, 5, false), 0)
  assert.equal(sliderKey('Home', 50, 0, 100, 5, false), 0)
  assert.equal(sliderKey('End', 50, 0, 100, 5, false), 100)
  assert.equal(sliderKey('Tab', 50, 0, 100, 5, false), null)
})
test('two discrete values map exactly to boolean switch states', () => {
  assert.equal(Boolean(sliderValue(0.49, 0, 1, 1)), false)
  assert.equal(Boolean(sliderValue(0.51, 0, 1, 1)), true)
  assert.equal(sliderKey('ArrowRight', 0, 0, 1, 1, false), 1)
  assert.equal(sliderKey('ArrowLeft', 1, 0, 1, 1, false), 0)
})

test('compact and thin pointer geometry reaches exact endpoints and midpoints', () => {
  for (const inset of [20, 8]) {
    assert.equal(sliderPointer(100 + inset, 100, 240, false, inset), 0)
    assert.equal(sliderPointer(340 - inset, 100, 240, false, inset), 1)
    assert.equal(sliderPointer(220, 100, 240, false, inset), 0.5)
    assert.equal(sliderPointer(100 + inset, 100, 240, true, inset), 1)
    assert.equal(sliderPointer(340 - inset, 100, 240, true, inset), 0)
  }
})
