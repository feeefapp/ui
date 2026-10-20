import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stepSpring } from '../src/primitives/spring-core.ts'

test('spring moves through intermediate values, overshoots softly and settles at target', () => {
  let state = { position: 0, velocity: 0 }
  let overshot = false
  state = stepSpring(state, 1, 1 / 60)
  assert.ok(state.position > 0 && state.position < 1)
  for (let i = 0; i < 180; i++) {
    state = stepSpring(state, 1, 1 / 60)
    if (state.position > 1) overshot = true
  }
  assert.ok(overshot)
  assert.ok(Math.abs(state.position - 1) < 0.00001)
  assert.ok(Math.abs(state.velocity) < 0.00001)
})
test('retargeting preserves momentum and remains stable across delayed frames', () => {
  let state = { position: 0, velocity: 0 }
  for (let i = 0; i < 6; i++) state = stepSpring(state, 1, 1 / 60)
  const previous = state.position
  state = stepSpring(state, 0, 1 / 240)
  assert.ok(state.position > previous)
  for (let i = 0; i < 120; i++) state = stepSpring(state, 0, i % 3 ? 1 / 30 : 10)
  assert.ok(Number.isFinite(state.position) && Number.isFinite(state.velocity))
  assert.ok(Math.abs(state.position) < 0.00001)
})
test('deformation spring stretches then returns to its resting shape', () => {
  let state = { position: 0, velocity: 0 }
  for (let i = 0; i < 10; i++) state = stepSpring(state, 1, 1 / 60, 330, 20)
  assert.ok(state.position > 0.5)
  for (let i = 0; i < 180; i++) state = stepSpring(state, 0, 1 / 60, 330, 20)
  assert.ok(Math.abs(state.position) < 0.00001)
})
