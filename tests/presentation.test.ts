import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alertActionOrder, alertActionsFit } from '../src/presentation/alert-model.ts'
import { POP_MOTION, popScale } from '../src/presentation/motion.ts'

// The same vectors are checked by flutter/test/presentation_test.dart.
test('alert actions sit side by side only when two fit half the row', () => {
  // 288 wide (320 − 2 × 16), 8 apart: each half is 140.
  assert.equal(alertActionsFit([120, 140], 288, 8), true)
  assert.equal(alertActionsFit([120, 141], 288, 8), false)
  assert.equal(alertActionsFit([140.4, 100], 288, 8), true, 'subpixel slack')
  assert.equal(alertActionsFit([80], 288, 8), false, 'one action stacks')
  assert.equal(alertActionsFit([60, 60, 60], 288, 8), false, 'three stack')
})

test('alert action order: cancel leads a row and ends a stack', () => {
  assert.deepEqual(alertActionOrder(['destructive', 'cancel'], true), [1, 0])
  assert.deepEqual(alertActionOrder(['destructive', 'cancel'], false), [0, 1])
  assert.deepEqual(alertActionOrder(['cancel', 'primary'], false), [1, 0])
  assert.deepEqual(alertActionOrder(['primary', 'destructive', 'cancel'], false), [0, 1, 2])
  assert.deepEqual(alertActionOrder(['cancel', undefined, 'primary'], false), [1, 2, 0])
  assert.deepEqual(alertActionOrder([undefined, 'primary'], true), [0, 1])
})

test('pop motion opens from 1.1 and rests at 1', () => {
  assert.equal(popScale(0), POP_MOTION.fromScale)
  assert.equal(popScale(1), 1)
  assert.ok(popScale(1.05) < 1, 'an overshoot dips below 1')
})
