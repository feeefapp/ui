import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diffStack, dragDismissRect, mixRect, slideFrame, zoomFrame } from '../src/containers/stack-model.ts'
import {
  detentHeight,
  detentHeights,
  dragHeight,
  releaseTarget,
  sheetDim,
  sheetRecede,
} from '../src/containers/sheet-model.ts'

test('stack diff: push, pop, pop to root, replace and unchanged tops', () => {
  assert.deepEqual(diffStack(['a'], ['a', 'b']), { kind: 'push', enter: 'b', exit: 'a' })
  assert.deepEqual(diffStack([], ['a']), { kind: 'push', enter: 'a', exit: null })
  assert.deepEqual(diffStack(['a', 'b'], ['a']), { kind: 'pop', enter: 'a', exit: 'b', removed: ['b'] })
  assert.deepEqual(diffStack(['a', 'b', 'c'], ['a']), { kind: 'pop', enter: 'a', exit: 'c', removed: ['b', 'c'] })
  assert.deepEqual(diffStack(['a', 'b'], ['a', 'c']), { kind: 'replace', enter: 'c', exit: 'b', removed: ['b'] })
  assert.deepEqual(diffStack(['a', 'b', 'c'], ['a', 'x', 'c']), { kind: 'none' })
  assert.deepEqual(diffStack(['a'], ['a']), { kind: 'none' })
})

test('slide frame: front enters from the trailing edge, back moves 30% and dims; mirrored in RTL', () => {
  assert.deepEqual(slideFrame(0, 400, false), { front: 400, back: -0, dim: 0 })
  assert.deepEqual(slideFrame(1, 400, false), { front: 0, back: -120, dim: 1 })
  const rtl = slideFrame(0.5, 400, true)
  assert.equal(rtl.front, -200)
  assert.equal(rtl.back, 60)
})

test('zoom frame maps a page onto a rect by width and clips its height', () => {
  const page = { width: 400, height: 800 }
  const full = zoomFrame({ x: 0, y: 0, width: 400, height: 800 }, 0, page)
  assert.equal(full.scale, 1)
  assert.equal(full.clip, 'inset(0 0 0px 0 round 0px)')
  const card = zoomFrame({ x: 20, y: 100, width: 100, height: 120 }, 12, page)
  assert.equal(card.scale, 0.25)
  assert.equal(card.transform, 'translate3d(20px, 100px, 0) scale(0.25)')
  // 120px visible at 0.25 = 480 page px, so 320px of the page is clipped; radius 12 → 48 page px.
  assert.equal(card.clip, 'inset(0 0 320px 0 round 48px)')
  const halfway = mixRect({ x: 0, y: 0, width: 100, height: 100 }, { x: 100, y: 50, width: 300, height: 500 }, 0.5)
  assert.deepEqual(halfway, { x: 50, y: 25, width: 200, height: 300 })
})

test('drag to dismiss: shrinks as it is pulled and keeps the grabbed point under the finger', () => {
  const page = { width: 400, height: 800 }
  const anchor = { x: 200, y: 300 }
  assert.deepEqual(dragDismissRect(page, anchor, 0, 0), { x: 0, y: 0, width: 400, height: 800 })
  const r = dragDismissRect(page, anchor, 30, 200)
  const scale = r.width / page.width
  assert.ok(scale < 0.95 && scale > 0.6)
  assert.ok(Math.abs(r.x + anchor.x * scale - (anchor.x + 30)) < 1e-9)
  assert.ok(Math.abs(r.y + anchor.y * scale - (anchor.y + 200)) < 1e-9)
  assert.ok(dragDismissRect(page, anchor, 0, -200).y > -200, 'pulling up resists')
})

test('detents resolve to heights clamped to large', () => {
  const m = { hostHeight: 800, topInset: 10, natural: 320 }
  assert.deepEqual(detentHeights(['medium', 'large', 'fit', 240, '25%'], m), [400, 790, 320, 240, 200])
  assert.equal(detentHeight('fit', { ...m, natural: 5000 }), 790)
  assert.equal(detentHeight(-20, m), 0)
})

test('dragging a sheet: 1:1 inside, rubber band above, free below only when dismissible', () => {
  const heights = [400, 790]
  assert.equal(dragHeight(500, heights, 800, true), 500)
  const above = dragHeight(900, heights, 800, true)
  assert.ok(above > 790 && above < 900)
  assert.equal(dragHeight(200, heights, 800, true), 200)
  const held = dragHeight(200, heights, 800, false)
  assert.ok(held < 400 && held > 200)
})

test('release: momentum picks the detent; a downward flick dismisses', () => {
  const heights = [400, 790]
  assert.deepEqual(releaseTarget(560, 0, heights, true), { height: 400, index: 0, dismiss: false })
  assert.deepEqual(releaseTarget(560, 2000, heights, true), { height: 790, index: 1, dismiss: false })
  assert.deepEqual(releaseTarget(300, -1500, heights, true), { height: 0, index: -1, dismiss: true })
  assert.equal(releaseTarget(300, -1500, heights, false).dismiss, false)
})

test('scrim and recede follow the visible height', () => {
  assert.equal(sheetDim(0, [400]), 0)
  assert.equal(sheetDim(200, [400, 790]), 0.5)
  assert.equal(sheetDim(790, [400, 790]), 1)
  assert.equal(sheetRecede(400, 790), 0)
  assert.equal(sheetRecede(790, 790), 1)
  assert.ok(sheetRecede(700, 790) > 0 && sheetRecede(700, 790) < 1)
})
