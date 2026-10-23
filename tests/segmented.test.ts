import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  SEGMENTED_OVERDRAG,
  segmentIndexAt,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedSnapIndex,
  type SegmentSpan,
} from '../src/primitives/segmented-model.ts'
import { segmentedFixture } from '../flutter/tool/segmented_fixture.ts'

const spans: SegmentSpan[] = [
  { start: 2, width: 52 },
  { start: 56, width: 110 },
  { start: 168, width: 74 },
]
const center = (s: SegmentSpan) => s.start + s.width / 2

test('a point picks the segment under it, gaps and overshoot the nearest', () => {
  assert.equal(segmentIndexAt(30, spans), 0)
  assert.equal(segmentIndexAt(100, spans), 1)
  assert.equal(segmentIndexAt(55, spans), 0, 'a gap goes to the nearest edge (tie: first)')
  assert.equal(segmentIndexAt(-50, spans), 0)
  assert.equal(segmentIndexAt(900, spans), 2)
})

test('the dragged pill follows the pointer inside the track', () => {
  assert.equal(segmentedDragCenter(120, 0, spans), 120)
  assert.equal(segmentedDragCenter(120, 10, spans), 110, 'keeps where it was grabbed')
})

test('past either end it rubber-bands, never further than the overdrag', () => {
  const first = center(spans[0])
  const last = center(spans[2])
  const a = segmentedDragCenter(first - 10, 0, spans)
  const b = segmentedDragCenter(first - 100, 0, spans)
  const c = segmentedDragCenter(first - 10_000, 0, spans)
  assert.ok(a < first && a > first - 10, 'resists')
  assert.ok(b < a && c < b, 'keeps giving')
  assert.ok(first - c < SEGMENTED_OVERDRAG, 'bounded')
  assert.ok(segmentedDragCenter(last + 40, 0, spans) > last)
  assert.ok(segmentedDragCenter(last + 40, 0, spans) < last + SEGMENTED_OVERDRAG)
})

test('the width changes from one segment to the next on the way', () => {
  assert.equal(segmentedPillWidth(center(spans[0]), spans), 52)
  assert.equal(segmentedPillWidth(center(spans[1]), spans), 110)
  const midway = (center(spans[0]) + center(spans[1])) / 2
  assert.equal(segmentedPillWidth(midway, spans), (52 + 110) / 2)
  assert.equal(segmentedPillWidth(-100, spans), 52, 'clamped at the ends')
  assert.equal(segmentedPillWidth(1000, spans), 74)
})

test('a slow release snaps to the nearest segment; a flick carries on', () => {
  const between = center(spans[0]) + 20
  assert.equal(segmentedSnapIndex(between, 0, spans), 0)
  assert.equal(segmentedSnapIndex(between, 1500, spans), 1, 'flicked forward')
  assert.equal(segmentedSnapIndex(center(spans[1]) - 20, -1500, spans), 0, 'flicked back')
  assert.equal(segmentedSnapIndex(center(spans[1]), 8000, spans), 2, 'never past the end')
})

test('a release never lands on a disabled segment', () => {
  const withDisabled = spans.map((s, i) => (i === 1 ? { ...s, disabled: true } : s))
  assert.notEqual(segmentedSnapIndex(center(spans[1]), 0, withDisabled), 1)
  assert.equal(segmentedSnapIndex(0, 0, spans.map((s) => ({ ...s, disabled: true }))), -1)
})


test('the shared fixture is current', () => {
  const file = JSON.parse(readFileSync(new URL('../flutter/test/fixtures/segmented.json', import.meta.url), 'utf8'))
  assert.deepEqual(file, JSON.parse(JSON.stringify(segmentedFixture())), 'run npx tsx flutter/tool/generate_segmented_fixture.ts')
})
