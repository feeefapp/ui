import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clampNumber,
  dragValue,
  fillFraction,
  keyValue,
  parseNumberExpression,
  stepDecimals,
} from '../src/primitives/number-field-core.ts'

test('typed expressions: arithmetic, parentheses, percent and decimal commas', () => {
  assert.equal(parseNumberExpression('1250*3'), 3750)
  assert.equal(parseNumberExpression('(4500 + 900) / 2'), 2700)
  assert.equal(parseNumberExpression('2000*15%'), 300)
  assert.equal(parseNumberExpression('-3+-2'), -5)
  assert.equal(parseNumberExpression('1,5'), 1.5)
  assert.equal(parseNumberExpression('1,250.75'), 1250.75)
  assert.equal(parseNumberExpression('12 500'), 12500)
  assert.equal(parseNumberExpression('٣٠٠'), 300)
  assert.equal(parseNumberExpression('6×7'), 42)
})

test('typed expressions reject anything that is not arithmetic', () => {
  for (const bad of ['', 'abc', '2+', '(1+2', '1)', 'alert(1)', '1/0', '2**3', '1e999'])
    assert.equal(parseNumberExpression(bad), null, bad)
})

test('values clamp to the bounds that exist and snap to the step', () => {
  const bounds = { min: 0, max: 100, step: 5 }
  assert.equal(clampNumber(-4, bounds), 0)
  assert.equal(clampNumber(103, bounds), 100)
  assert.equal(clampNumber(42, bounds), 40)
  assert.equal(clampNumber(43, bounds), 45)
  assert.equal(clampNumber(-12.34, { step: 0.1 }), -12.3)
  assert.equal(clampNumber(7, { min: 10, step: 1 }), 10)
  assert.equal(clampNumber(0.1 + 0.2, { step: 0.1 }), 0.3)
})

test('bounded drag maps the full width to the full range, relative to the start value', () => {
  const bounds = { min: 0, max: 100, step: 1 }
  assert.equal(dragValue({ ...bounds, startValue: 50, dx: 100, width: 200 }), 100)
  assert.equal(dragValue({ ...bounds, startValue: 50, dx: -50, width: 200 }), 25)
  assert.equal(dragValue({ ...bounds, startValue: 50, dx: 0, width: 200 }), 50, 'no jump at press')
  assert.equal(dragValue({ ...bounds, startValue: 50, dx: 100, width: 200, fine: true }), 55, 'shift is 10× finer')
  assert.equal(dragValue({ ...bounds, startValue: 50, dx: 100, width: 200, rtl: true }), 0, 'rtl flips direction')
})

test('unbounded drag moves one step per 8px', () => {
  assert.equal(dragValue({ step: 50, startValue: 1000, dx: 40, width: 300 }), 1250)
  assert.equal(dragValue({ step: 50, startValue: 1000, dx: -16, width: 300 }), 900)
})

test('keyboard steps, page steps and ends stay on the step grid', () => {
  const bounds = { min: 0, max: 10, step: 1 }
  assert.equal(keyValue('ArrowUp', 5, bounds), 6)
  assert.equal(keyValue('ArrowLeft', 5, bounds), 4)
  assert.equal(keyValue('ArrowLeft', 5, bounds, { rtl: true }), 6)
  assert.equal(keyValue('PageUp', 5, bounds), 10)
  assert.equal(keyValue('Home', 5, bounds), 0)
  assert.equal(keyValue('End', 5, bounds), 10)
  assert.equal(keyValue('ArrowUp', 0.3, { min: 0, max: 1, step: 0.1 }), 0.4)
  assert.equal(keyValue('Home', 5, { step: 1 }), null, 'no Home without a min')
  assert.equal(keyValue('a', 5, bounds), null)
})

test('display precision and fill follow the step and range', () => {
  assert.equal(stepDecimals(1), 0)
  assert.equal(stepDecimals(0.25), 2)
  assert.equal(stepDecimals(1e-7), 7)
  assert.equal(fillFraction(25, { min: 0, max: 100, step: 1 }), 0.25)
  assert.equal(fillFraction(25, { step: 1 }), 0)
})
