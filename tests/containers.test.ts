import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectMomentum } from '../src/physics/spring.ts'
import { diffStack, dragDismissRect, mixRect, slideFrame, zoomFrame } from '../src/containers/stack-model.ts'
import {
  detentHeight,
  detentHeights,
  dragHeight,
  wheelDismisses,
  wheelHeight,
  releaseTarget,
  focusRaise,
  freeTarget,
  flingStep,
  nearestDetent,
  sheetScrollStep,
  sheetDim,
  sheetFrame,
  sheetMorphFrame,
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

test('the wheel moves a sheet freely above its lowest height and at half speed below it', () => {
  assert.equal(wheelHeight(500, 60, 400, 790, true), 560)
  assert.equal(wheelHeight(780, 60, 400, 790, true), 790)
  assert.equal(wheelHeight(500, -60, 400, 790, true), 440)
  assert.equal(wheelHeight(420, -60, 400, 790, true), 380)
  assert.equal(wheelHeight(380, -60, 400, 790, true), 350)
  assert.equal(wheelHeight(10, -60, 400, 790, true), 0)
  assert.equal(wheelHeight(420, -60, 400, 790, false), 400)
  assert.equal(wheelDismisses(350, 400), false)
  assert.equal(wheelDismisses(336, 400), true)
  assert.equal(wheelDismisses(60, 100), true)
  assert.equal(wheelDismisses(70, 100), false)
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

test('peek is the measured header, with a fallback', () => {
  const m = { hostHeight: 800, topInset: 10, natural: 320 }
  assert.equal(detentHeight('peek', { ...m, peek: 84 }), 84)
  assert.equal(detentHeight('peek', m), 72)
})

test('background interaction: no dim up to the undimmed detent, full at the next one', () => {
  const heights = [84, 400, 790]
  assert.equal(sheetDim(84, heights, 84, 790), 0)
  assert.equal(sheetDim(400, heights, 84, 790), 1)
  assert.equal(sheetDim(242, heights, 84, 790), 0.5)
  // Undimmed through medium: dims only between medium and large.
  assert.equal(sheetDim(400, heights, 400, 790), 0)
  assert.equal(sheetDim(790, heights, 400, 790), 1)
  // Undimmed at the top detent: never dims.
  assert.equal(sheetDim(790, heights, 790, 790), 0)
})

test('floating frame: inset glass low, edges and opaque at full height', () => {
  const o = { heights: [84, 400, 790], large: 790, inset: 8, radius: 32, mode: 'float' as const }
  const low = sheetFrame(84, o)
  assert.deepEqual(low, { expansion: 0, gap: 8, bottomRadius: 32, solid: 0 })
  const mid = sheetFrame(400, o)
  assert.ok(mid.gap > 0 && mid.gap < 8, 'medium sits closer to the edges')
  assert.equal(mid.solid, 0, 'medium is still glass')
  const full = sheetFrame(790, o)
  assert.deepEqual(full, { expansion: 1, gap: 0, bottomRadius: 0, solid: 1 })
  // Monotonic: the gap only closes as it rises.
  let last = Infinity
  for (let v = 84; v <= 790; v += 20) {
    const f = sheetFrame(v, o)
    assert.ok(f.gap <= last + 1e-9)
    last = f.gap
  }
  // Below the lowest detent (dragging away) it keeps the floating look.
  assert.equal(sheetFrame(20, o).gap, 8)
  assert.deepEqual(sheetFrame(400, { ...o, mode: 'attached' }), { expansion: 1, gap: 0, bottomRadius: 0, solid: 1 })
  assert.deepEqual(sheetFrame(790, { ...o, mode: 'card' }), { expansion: 0, gap: 8, bottomRadius: 32, solid: 0 })
})

test('morph: clipped to the source over it at 0, the panel at rest at 1', () => {
  const panel = { x: 0, y: 400, width: 390, height: 400 }
  const source = { x: 300, y: 50, width: 80, height: 40 }
  const start = sheetMorphFrame(0, panel, source, 20, 32)
  // Clip window centred at the panel top, moved onto the source's centre and top.
  assert.equal(start.transform, 'translate3d(145px, -350px, 0)')
  assert.equal(start.clip, 'inset(0px 155px 360px 155px round 20px)')
  assert.equal(start.content, 0)
  const end = sheetMorphFrame(1, panel, source, 20, 32)
  assert.equal(end.transform, 'translate3d(0px, 0px, 0)')
  assert.equal(end.clip, 'inset(0px 0px 0px 0px round 32px)')
  assert.equal(end.content, 1)
  // A capsule radius larger than half the source is clamped to it.
  assert.ok(sheetMorphFrame(0, panel, source, 999, 32).clip.endsWith('round 20px)'))
})

test('a focused field raises a peek sheet to its top detent', () => {
  const detents = ['peek', 'medium', 'large'] as const
  const heights = [84, 400, 790]
  assert.equal(focusRaise(detents, heights, 0, undefined), 2)
  assert.equal(focusRaise(detents, heights, 1, undefined), null)
  assert.equal(focusRaise(detents, heights, 0, 'medium'), 1)
  assert.equal(focusRaise(detents, heights, 2, 'medium'), null)
  assert.equal(focusRaise(detents, heights, 0, null), null)
})

test('free release: momentum, kept between the lowest and highest detents', () => {
  const heights = [84, 400, 790]
  assert.deepEqual(freeTarget(500, 0, heights, true), { height: 500, dismiss: false })
  assert.ok(Math.abs(freeTarget(500, 1000, heights, true).height - 599) < 1e-9)
  assert.deepEqual(freeTarget(700, 4000, heights, true), { height: 790, dismiss: false })
  assert.deepEqual(freeTarget(120, -3000, heights, true), { height: 0, dismiss: true })
  assert.deepEqual(freeTarget(120, -3000, heights, false), { height: 84, dismiss: false })
  assert.equal(nearestDetent(560, heights), 1)
  assert.equal(nearestDetent(600, heights), 2)
  assert.equal(nearestDetent(10, heights), 0)
})

test('scroll handoff: grow, then scroll, then stretch; back in reverse', () => {
  // Growing from medium: 300 to the top, the rest scrolls; content that scrolls stops at its end.
  assert.deepEqual(sheetScrollStep({ raw: 400, scroll: 0 }, 500, 700, 1000), { raw: 700, scroll: 200 })
  assert.deepEqual(sheetScrollStep({ raw: 700, scroll: 950 }, 100, 700, 1000), { raw: 700, scroll: 1000 })
  // Down: the stretch goes first, then the scroll back to the top, then the sheet shrinks.
  assert.deepEqual(sheetScrollStep({ raw: 750, scroll: 1000 }, -60, 700, 1000), { raw: 700, scroll: 990 })
  assert.deepEqual(sheetScrollStep({ raw: 700, scroll: 200 }, -500, 700, 1000), { raw: 400, scroll: 0 })
  assert.deepEqual(sheetScrollStep({ raw: 400, scroll: 0 }, -500, 700, 1000), { raw: -100, scroll: 0 })
  // Content that does not scroll: everything moves the sheet.
  assert.deepEqual(sheetScrollStep({ raw: 690, scroll: 0 }, 30, 700, 0), { raw: 720, scroll: 0 })
  assert.deepEqual(sheetScrollStep({ raw: 400, scroll: 0 }, 0, 700, 0), { raw: 400, scroll: 0 })
})

test('content fling decays like UIScrollView and reports what is left', () => {
  const a = flingStep(0, 2000, 16)
  assert.ok(a.scroll > 30 && a.scroll < 32)
  assert.ok(Math.abs(a.velocity - 2000 * Math.pow(0.998, 16)) < 1e-9)
  // Over a long time it reaches the projected distance.
  const far = flingStep(0, 2000, 100000)
  assert.ok(Math.abs(far.scroll - projectMomentum(0, 2000, 0.998)) < 1e-6)
  assert.ok(far.velocity < 1e-6)
})
