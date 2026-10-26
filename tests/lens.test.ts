import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  LENS_PILL_LIFT,
  LENS_TAB_SCALE,
  LENS_THUMB_SCALE,
  SWITCH_OVERDRAG,
  lensInkZoom,
  lensPillShape,
  lensStretch,
  switchDragPosition,
  switchSnap,
  touchOutset,
} from '../src/primitives/lens-model.ts'
import { GLASS_STRETCH_LIMIT } from '../src/glass/press.ts'
import { LENS_MATERIAL, LENS_SHADOW, lensMaterial } from '../src/glass/material.ts'
import { LENS_BEND, lensBend, lensDisplacementMap } from '../src/glass/refraction.ts'
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

test('a liquid pill lens grows by LENS_PILL_LIFT, as iOS 26.2: 96 × 28 → 120 × 44', () => {
  const pill = { x: 53, y: 184, width: 96, height: 28 }
  assert.deepEqual(lensPillShape(pill, 14, 0, true), { ...pill, radius: 14 }, 'no lens, no lift')
  assert.deepEqual(lensPillShape(pill, 14, 1, true), { x: 41, y: 176, width: 120, height: 44, radius: 22 })
  const half = lensPillShape(pill, 14, 0.5, true)
  assert.equal(half.width, 96 + LENS_PILL_LIFT.x)
  assert.equal(half.height, 28 + LENS_PILL_LIFT.y)
  assert.deepEqual(lensPillShape(pill, 14, 1, false), { ...pill, radius: 14 }, 'transparent glass keeps the pill box')
  assert.equal(lensPillShape(pill, 80, 0, true).radius, 14, 'the corner never passes half the shorter side')
})

test('a thumb lens is iOS 26.2\'s 57 × 37 over its 37 × 24 thumb', () => {
  assert.ok(Math.abs(37 * LENS_THUMB_SCALE - 57) < 0.5 && Math.abs(24 * LENS_THUMB_SCALE - 37) < 0.5)
})

test('only a tab bar\'s item grows under the lens', () => {
  assert.equal(lensInkZoom(1, true), LENS_TAB_SCALE)
  assert.equal(lensInkZoom(0.5, true), 1 + (LENS_TAB_SCALE - 1) / 2)
  assert.equal(lensInkZoom(1, false), 1, 'segmented labels keep their size')
  assert.equal(lensInkZoom(2, true), LENS_TAB_SCALE, 'clamped')
})

test('the bend follows the measured iOS profiles', () => {
  // research/liquid-glass/LENS-MEASURED.md §2 (positive = from further inside).
  const near = (a: number, b: number, tolerance: number) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b}`)
  assert.ok(lensBend('pill', 0.17) > 3, 'an inward rim')
  near(lensBend('pill', 2.17), -2.0, 0.25)
  near(lensBend('pill', 3.17), -3.0, 0.35)
  near(lensBend('pill', 5), -4.3, 0.1)
  near(lensBend('pill', 9.17), -3.0, 0.3)
  near(lensBend('pill', 13.17), -2.0, 0.25)
  near(lensBend('pill', 20.17), -1.0, 0.1)
  near(lensBend('thumb', 0.5), 7.1, 0.1)
  near(lensBend('thumb', 2.17), 4.6, 0.3)
  near(lensBend('thumb', 4.17), 1.6, 0.3)
  near(lensBend('thumb', 6.17), 0.3, 0.3)
  assert.equal(lensBend('thumb', 8), 0, 'flat beyond 7.5 px')
  assert.equal(lensBend('pill', -1), 0, 'nothing outside')
})

test('the lens map bends by lensBend and leans the pill away from its centre', () => {
  const shape = { x: 0, y: 0, width: 120, height: 44, radius: 22 }
  const map = lensDisplacementMap(shape, 'pill')
  const density = map.width / 120
  const at = (x: number, y: number) => {
    const i = (Math.floor(y * density) * map.width + Math.floor(x * density)) * 4
    return { dx: ((map.data[i] - 128) / 127) * (map.scale / 2), dy: ((map.data[i + 1] - 128) / 127) * (map.scale / 2), alpha: map.data[i + 3] }
  }
  assert.ok(density > 1, 'finer than 1 sample per px: the rim is under 1 px wide')
  // 5 px under the top edge the pill shows the backdrop from further out (up)...
  const top = at(60, 5)
  assert.ok(Math.abs(top.dy + 4.3) < 0.3, `dy ${top.dy}`)
  // ...and leans sideways away from the centre, 36 px off it (iOS: about 1.5 px).
  assert.ok(at(24, 5).dx < -1 && at(96, 5).dx > 1)
  assert.ok(Math.abs(at(60, 5).dx) < 0.2)
  assert.equal(at(60, 22).alpha, 255)
  assert.equal(at(0.5, 0.5).alpha, 0, 'the cut corner')
  const thumb = lensDisplacementMap({ x: 0, y: 0, width: 57, height: 37, radius: 18.5 }, 'thumb')
  const td = thumb.width / 57
  const ti = (Math.floor(2 * td) * thumb.width + Math.floor(28.5 * td)) * 4
  assert.ok(((thumb.data[ti + 1] - 128) / 127) * (thumb.scale / 2) > 4, 'a thumb bends inward (down) under its top edge')
})

test('the lens material: clear, a shade from the top, the measured rim and shadow', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const kind of ['pill', 'thumb', 'switch'] as const) {
      const rest = lensMaterial(kind, 0, scheme)
      assert.equal(rest.veil, 0)
      assert.equal(rest.shade.top, 0)
      assert.equal(rest.shadow, 0)
      const glass = lensMaterial(kind, 1, scheme)
      assert.equal(glass.veil, LENS_MATERIAL[kind].veil)
      assert.ok(glass.shade.top > glass.shade.middle, 'darker along the top')
      assert.equal(glass.shadow, LENS_SHADOW.alpha)
      assert.ok(glass.rimEdge.side >= glass.rim.side, 'brightest at the outline')
      assert.equal(lensMaterial(kind, 0.5, scheme).shadow, LENS_SHADOW.alpha / 2)
    }
  }
  assert.equal(LENS_MATERIAL.pill.veil, 0, 'the pill never veils: black stays black')
  assert.ok(lensMaterial('pill', 1, 'dark').rimEdge.top > lensMaterial('pill', 1, 'light').rimEdge.top, 'dark appearance lights the rim more')
})

test('a switch bends like the pill at two thirds and zooms its middle out', () => {
  // LENS-MEASURED.md §2: the Toggle's lens peaks at about 2.9 px outward, 5 px in.
  assert.ok(Math.abs(lensBend('switch', 5) + 2.9) < 0.1)
  assert.ok(lensBend('switch', 0.2) > 0, 'an inward rim')
  const map = lensDisplacementMap({ x: 0, y: 0, width: 57, height: 37, radius: 18.5 }, 'switch')
  const density = map.width / 57
  const dx = (x: number, y: number) => ((map.data[(Math.floor(y * density) * map.width + Math.floor(x * density)) * 4] - 128) / 127) * (map.scale / 2)
  // Across the middle it shows the backdrop from further out, growing with the offset.
  assert.ok(dx(48, 18.5) > dx(38, 18.5) && dx(38, 18.5) > 0)
  assert.ok(dx(9, 18.5) < 0)
  assert.ok(Math.abs(dx(28.5, 18.5)) < 0.1, 'the centre stays')
  assert.ok(LENS_BEND.switch.zoom.x > 0)
})

test('only a slider thumb softens its edge band', () => {
  const blue = (kind: 'pill' | 'thumb' | 'switch', x: number) => {
    const map = lensDisplacementMap({ x: 0, y: 0, width: 57, height: 37, radius: 18.5 }, kind)
    const density = map.width / 57
    return map.data[(Math.floor(18.5 * density) * map.width + Math.floor(x * density)) * 4 + 2]
  }
  assert.ok(blue('thumb', 0.5) > 200, 'full at the rim')
  assert.ok(blue('thumb', 3) > 0 && blue('thumb', 3) < blue('thumb', 0.5))
  assert.equal(blue('thumb', LENS_BEND.thumb.soft + 1), 0, 'sharp past the band')
  assert.equal(blue('pill', 0.5), 0)
  assert.equal(blue('switch', 0.5), 0)
})
