import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  SWITCH_OVERDRAG,
  lensStretch,
  switchDragPosition,
  switchSnap,
  touchOutset,
} from '../src/primitives/lens-model.ts'
import { GLASS_STRETCH_LIMIT } from '../src/glass/press.ts'
import { lensFixture } from '../flutter/tool/lens_fixture.ts'

test('the lens stretches with speed, signed and bounded', () => {
  assert.equal(lensStretch(0), 0)
  assert.ok(lensStretch(800) > 0 && lensStretch(-800) < 0)
  assert.equal(lensStretch(800), -lensStretch(-800))
  assert.ok(lensStretch(1600) > lensStretch(800))
  assert.ok(lensStretch(1e6) <= GLASS_STRETCH_LIMIT)
})

test('a dragged switch thumb follows the pointer between its ends', () => {
  assert.equal(switchDragPosition(0, 13, 26), 0.5)
  assert.equal(switchDragPosition(1, -13, 26), 0.5)
  assert.equal(switchDragPosition(0, 26, 26), 1)
  assert.equal(switchDragPosition(0, 0, 0), 0, 'no travel: stays')
})

test('past either end it rubber-bands, never further than the overdrag', () => {
  const a = switchDragPosition(1, 10, 26)
  const b = switchDragPosition(1, 1000, 26)
  assert.ok(a > 1 && b > a, 'keeps giving')
  assert.ok((b - 1) * 26 < SWITCH_OVERDRAG, 'bounded')
  assert.ok(switchDragPosition(0, -40, 26) < 0)
})

test('a release lands on the nearer side; a flick toggles', () => {
  assert.equal(switchSnap(0.3, 0), 0)
  assert.equal(switchSnap(0.7, 0), 1)
  assert.equal(switchSnap(0.5, 0), 1, 'the middle turns on')
  assert.equal(switchSnap(0.2, 20), 1, 'flicked on')
  assert.equal(switchSnap(0.8, -20), 0, 'flicked off')
  assert.equal(switchSnap(0.2, 1), 0, 'a slow push stays')
})

test('the hit area reaches out to the target, never in', () => {
  assert.equal(touchOutset(30, 44), 7)
  assert.equal(touchOutset(36, 44), 4)
  assert.equal(touchOutset(52, 44), 0)
})

test('the shared fixture is current', () => {
  const file = JSON.parse(readFileSync(new URL('../flutter/test/fixtures/lens.json', import.meta.url), 'utf8'))
  assert.deepEqual(file, JSON.parse(JSON.stringify(lensFixture())), 'run npx tsx flutter/tool/generate_lens_fixture.ts')
})
