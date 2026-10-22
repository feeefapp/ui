import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reorderLanding, reorderShifts, reorderTarget, swipeIsFull, swipeRelease } from '../src/primitives/list-model.ts'
import { centeredIndex, flickTarget, slideEffect, slideProgress } from '../src/containers/carousel-model.ts'
import { pickFitting } from '../src/containers/adaptive-model.ts'
import { SPRINGS, springTiming } from '../src/physics/spring.ts'

const sides = { leading: 76, trailing: 152, row: 360, fullLeading: true, fullTrailing: true }

test('swipe release: snaps open past half, closes short, commits past the full threshold', () => {
  assert.deepEqual(swipeRelease(-90, 0, sides), { offset: -152, commit: null })
  assert.deepEqual(swipeRelease(-40, 0, sides), { offset: 0, commit: null })
  assert.deepEqual(swipeRelease(-40, -1500, sides), { offset: -152, commit: null }, 'a flick opens it')
  assert.deepEqual(swipeRelease(-90, 1500, sides), { offset: 0, commit: null }, 'a flick back closes it')
  assert.deepEqual(swipeRelease(-230, 0, sides), { offset: -360, commit: 'trailing' })
  assert.deepEqual(swipeRelease(230, 0, sides), { offset: 360, commit: 'leading' })
  assert.deepEqual(swipeRelease(230, 0, { ...sides, fullLeading: false }), { offset: 76, commit: null })
  assert.deepEqual(swipeRelease(60, 0, { ...sides, leading: 0 }), { offset: 0, commit: null }, 'no actions on that side')
  assert.equal(swipeIsFull(-230, sides), true)
  assert.equal(swipeIsFull(-150, sides), false)
})

test('reorder: target follows the dragged center; others shift to open the gap', () => {
  const h = [56, 56, 72, 56]
  assert.equal(reorderTarget(h, 0, 0), 0)
  assert.equal(reorderTarget(h, 0, 40), 0, 'center not yet past the next center (68 < 84)')
  assert.equal(reorderTarget(h, 0, 60), 1)
  assert.equal(reorderTarget(h, 0, 140), 2)
  assert.equal(reorderTarget(h, 3, -200), 0)
  assert.deepEqual(reorderShifts(h, 0, 2), [0, -56, -56, 0])
  assert.deepEqual(reorderShifts(h, 3, 1), [0, 56, 56, 0])
  assert.equal(reorderLanding(h, 0, 2), 128)
  assert.equal(reorderLanding(h, 3, 1), -128)
  assert.equal(reorderLanding(h, 1, 1), 0)
})

test('carousel: progress, centered slide and momentum-projected flicks', () => {
  assert.equal(slideProgress(300, 200, 100), 1)
  assert.equal(centeredIndex([-1.2, -0.2, 0.8]), 1)
  const offsets = [0, 300, 600, 900, 1200, 1500]
  assert.equal(flickTarget(310, 0, offsets, 1), 1)
  assert.equal(flickTarget(310, 2000, offsets, 1), 4, 'capped at three slides away')
  assert.equal(flickTarget(310, 400, offsets, 1), 2)
  assert.equal(slideEffect('scale', 0).transform, 'scale(1)')
  assert.equal(slideEffect('scale', 2).transform, 'scale(0.92)')
  assert.ok(slideEffect('fade', 1).opacity < 0.5)
})

test('view that fits picks the first option with room, else the last', () => {
  assert.equal(pickFitting([420, 140, 44], 500), 0)
  assert.equal(pickFitting([420, 140, 44], 200), 1)
  assert.equal(pickFitting([420, 140, 44], 30), 2)
})

test('spring timing traces the spring as a CSS linear() easing ending at 1', () => {
  const smooth = springTiming(SPRINGS.smooth)
  assert.ok(smooth.duration > 400 && smooth.duration < 1500, String(smooth.duration))
  assert.match(smooth.easing, /^linear\(0, .*, 1\)$/)
  const bouncy = springTiming(SPRINGS.bouncy)
  assert.ok(bouncy.easing.split(', ').some((v) => parseFloat(v) > 1), 'overshoot survives')
})
