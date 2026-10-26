import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  SEGMENTED_AUTOSCROLL_SPEED,
  SEGMENTED_AUTOSCROLL_ZONE,
  SEGMENTED_FADE,
  SEGMENTED_OVERDRAG,
  segmentedAutoScrollSpeed,
  segmentedRevealOffset,
  segmentIndexAt,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedSnapIndex,
  selectionKeyTarget,
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

test('a pill dragged near an edge scrolls toward it, faster the closer it gets', () => {
  assert.equal(segmentedAutoScrollSpeed(160, 0, 320), 0, 'still in the middle')
  assert.equal(segmentedAutoScrollSpeed(SEGMENTED_AUTOSCROLL_ZONE, 0, 320), 0, 'zone edge')
  const near = segmentedAutoScrollSpeed(30, 0, 320)
  const nearer = segmentedAutoScrollSpeed(10, 0, 320)
  assert.ok(near < 0 && nearer < near, 'toward the start, speeding up')
  assert.equal(segmentedAutoScrollSpeed(-50, 0, 320), -SEGMENTED_AUTOSCROLL_SPEED, 'capped past the edge')
  assert.equal(segmentedAutoScrollSpeed(310, 0, 320), -segmentedAutoScrollSpeed(10, 0, 320), 'symmetric')
  assert.equal(segmentedAutoScrollSpeed(10, 0, 0), 0, 'no viewport')
})

test('revealing an option scrolls the least, clear of the fades, within the scroll range', () => {
  assert.equal(segmentedRevealOffset(0, 400, 320, 100, 160), 0, 'already visible')
  assert.equal(segmentedRevealOffset(0, 400, 320, 300, 380), 380 - (320 - SEGMENTED_FADE), 'to the end')
  assert.equal(segmentedRevealOffset(200, 400, 320, 150, 200), 150 - SEGMENTED_FADE, 'back to the start')
  assert.equal(segmentedRevealOffset(100, 400, 320, 2, 60), 0, 'clamped at 0')
  assert.equal(segmentedRevealOffset(300, 400, 320, 690, 718), 400, 'clamped at max')
})

// A tab bar (TabView): tabs 68–120px wide, 2px apart inside a 4px inset; right to left the same
// tabs run from the right edge.
const tabs: SegmentSpan[] = [
  { start: 4, width: 68 },
  { start: 74, width: 68 },
  { start: 144, width: 82 },
  { start: 228, width: 68 },
]
const tabsRtl = [...tabs].reverse()

test('a tab-bar drag selects the tab it is released on, left to right', () => {
  // Grabbed on the first tab and carried to the third: a slow release lands on it…
  const dropped = segmentedDragCenter(center(tabs[2]) + 6, 0, tabs)
  assert.equal(segmentedSnapIndex(dropped, 0, tabs), 2)
  // …a careful drop just past the middle of the first two picks the nearer one…
  assert.equal(segmentedSnapIndex((center(tabs[0]) + center(tabs[1])) / 2 + 2, 0, tabs), 1)
  // …and a flick from the second carries on to the next.
  assert.equal(segmentedSnapIndex(center(tabs[1]) + 10, 1500, tabs), 2)
  // The lens takes each tab's width on the way.
  assert.equal(segmentedPillWidth(center(tabs[2]), tabs), 82)
})

test('a tab-bar drag selects the tab it is released on, right to left', () => {
  // Option order runs right to left: the first tab is on the right, dragging left reaches the third.
  const first = center(tabsRtl[0])
  assert.equal(first, center(tabs[3]))
  const dropped = segmentedDragCenter(center(tabsRtl[2]) - 6, 0, tabsRtl)
  assert.equal(segmentedSnapIndex(dropped, 0, tabsRtl), 2)
  assert.equal(segmentedSnapIndex(center(tabsRtl[1]) - 10, -1500, tabsRtl), 2, 'a leftward flick carries on')
  // Past the leftmost tab it rubber-bands, never past the overdrag.
  const far = segmentedDragCenter(-500, 0, tabsRtl)
  assert.ok(far < center(tabsRtl[3]) && far > center(tabsRtl[3]) - SEGMENTED_OVERDRAG)
  assert.equal(segmentedSnapIndex(far, 0, tabsRtl), 3)
})

test('a tab list roves with Left and Right only; a radio group also with Up and Down', () => {
  // Left to right: Right is next, Left previous, both wrap; Home and End jump.
  assert.equal(selectionKeyTarget('ArrowRight', 0, 4, false, 'tab'), 1)
  assert.equal(selectionKeyTarget('ArrowRight', 3, 4, false, 'tab'), 0, 'wraps')
  assert.equal(selectionKeyTarget('ArrowLeft', 0, 4, false, 'tab'), 3, 'wraps back')
  assert.equal(selectionKeyTarget('Home', 2, 4, false, 'tab'), 0)
  assert.equal(selectionKeyTarget('End', 0, 4, false, 'tab'), 3)
  // A horizontal tab list leaves Up and Down to the page; a radio group takes them.
  assert.equal(selectionKeyTarget('ArrowDown', 0, 4, false, 'tab'), null)
  assert.equal(selectionKeyTarget('ArrowUp', 0, 4, false, 'tab'), null)
  assert.equal(selectionKeyTarget('ArrowDown', 0, 4, false, 'radio'), 1)
  assert.equal(selectionKeyTarget('ArrowUp', 0, 4, false, 'radio'), 3)
  // Right to left mirrors Left and Right (not Up and Down).
  assert.equal(selectionKeyTarget('ArrowLeft', 0, 4, true, 'tab'), 1)
  assert.equal(selectionKeyTarget('ArrowRight', 0, 4, true, 'tab'), 3)
  assert.equal(selectionKeyTarget('ArrowDown', 0, 4, true, 'radio'), 1)
  // Nothing selected starts from the first; other keys and empty groups are not handled.
  assert.equal(selectionKeyTarget('ArrowRight', -1, 4, false, 'tab'), 1)
  assert.equal(selectionKeyTarget('Enter', 0, 4, false, 'tab'), null)
  assert.equal(selectionKeyTarget('Home', -1, 0, false, 'radio'), null)
})

test('the shared fixture is current', () => {
  const file = JSON.parse(readFileSync(new URL('../flutter/test/fixtures/segmented.json', import.meta.url), 'utf8'))
  assert.deepEqual(file, JSON.parse(JSON.stringify(segmentedFixture())), 'run npx tsx flutter/tool/generate_segmented_fixture.ts')
})
