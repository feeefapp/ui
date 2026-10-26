import { test } from 'node:test'
import assert from 'node:assert/strict'
import { minimizeGeometry, minimizeProgress, MINIMIZE_DISTANCE } from '../src/containers/tab-view-minimize'

const at = {
  chrome: { x: 0, y: 0, width: 374, height: 120 },
  bar: { x: 47, y: 60, width: 280, height: 60 },
  track: 280,
  option: { x: 51, y: 64, width: 72, height: 52 },
  icon: { dx: 0, dy: 8 },
  accessory: { x: 0, y: 0, width: 374, height: 52 },
  gap: 8,
  rtl: false,
}

test('scrolling moves the progress continuously, both ways', () => {
  assert.equal(minimizeProgress(0, MINIMIZE_DISTANCE / 4, 200), 0.25)
  assert.equal(minimizeProgress(0.25, MINIMIZE_DISTANCE / 4, 200), 0.5)
  assert.ok(minimizeProgress(0.5, -10, 200) < 0.5)
  assert.equal(minimizeProgress(0.8, 4, 0), 0, 'the top restores the bar')
  assert.equal(minimizeProgress(0, 2, 2), 2 / 24 < 2 / MINIMIZE_DISTANCE ? 2 / 24 : 2 / MINIMIZE_DISTANCE)
  assert.equal(minimizeProgress(0.98, 50, 400), 1)
})

test('rest and minimized ends', () => {
  const full = minimizeGeometry(at, 0)
  assert.deepEqual(full.bar, { x: 47, y: 60, width: 280, height: 60 })
  assert.deepEqual(full.accessory, { x: 0, y: 0, width: 374 })
  assert.deepEqual({ x: full.trackShift.x + 0, y: full.trackShift.y + 0 }, { x: 0, y: 0 })
  const min = minimizeGeometry(at, 1)
  // A 48pt circle centred on the bar's line (iOS 27).
  assert.deepEqual(min.bar, { x: 0, y: 66, width: 48, height: 48 })
  assert.deepEqual(min.accessory, { x: 56, y: 64, width: 318 })
  // The selected tab's centre (4 + 36 = 40 from the bar's start, 30 down) ends at the circle's (24, 24).
  assert.deepEqual(min.trackShift, { x: -16, y: -6 })
  assert.deepEqual(min.icon, { dx: 0, dy: 8 })
})

test('the accessory never overlaps the shrinking bar', () => {
  for (let i = 0; i <= 20; i++) {
    const f = minimizeGeometry(at, i / 20)
    const a = f.accessory!
    if (a.y + at.accessory.height > at.bar.y) assert.ok(a.x >= f.bar.x + f.bar.width + at.gap - 1e-9, `t=${i / 20}`)
  }
})

test('right to left mirrors the ends', () => {
  const min = minimizeGeometry({ ...at, rtl: true }, 1)
  assert.deepEqual(min.bar, { x: 326, y: 66, width: 48, height: 48 })
  assert.deepEqual(min.accessory, { x: 0, y: 64, width: 318 })
})
