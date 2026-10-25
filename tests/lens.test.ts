import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  LENS_MAGNIFY,
  LENS_PILL_LIFT,
  SWITCH_OVERDRAG,
  lensInkZoom,
  lensMagnify,
  lensPillShape,
  lensStretch,
  switchDragPosition,
  switchSnap,
  touchOutset,
} from '../src/primitives/lens-model.ts'
import { GLASS_STRETCH_LIMIT } from '../src/glass/press.ts'
import { glassHairline, glassMaterial, glassRim, lensMaterial } from '../src/glass/material.ts'
import { lensDisplacementMap, magnifyOffset } from '../src/glass/refraction.ts'
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

test('a liquid pill lens lifts out by LENS_PILL_LIFT of its height on every side', () => {
  const pill = { x: 10, y: 4, width: 90, height: 54 }
  const rest = lensPillShape(pill, 27, 0, true)
  assert.deepEqual(rest, { ...pill, radius: 27 }, 'no lens, no lift')
  const full = lensPillShape(pill, 27, 1, true)
  const lift = 54 * LENS_PILL_LIFT
  assert.ok(Math.abs(full.x - (10 - lift)) < 1e-9 && Math.abs(full.y - (4 - lift)) < 1e-9)
  assert.ok(Math.abs(full.width - (90 + 2 * lift)) < 1e-9)
  assert.ok(Math.abs(full.height - (54 + 2 * lift)) < 1e-9)
  assert.ok(Math.abs(full.radius - (27 + lift)) < 1e-9, 'the capsule stays a capsule')
  assert.ok(full.height > 62, 'a 54 px tab lens sticks out of its 62 px bar')
  const half = lensPillShape(pill, 27, 0.5, true)
  assert.ok(Math.abs(half.width - (90 + lift)) < 1e-9, 'eased in with the lens')
  assert.deepEqual(lensPillShape(pill, 27, 1, false), { ...pill, radius: 27 }, 'transparent glass keeps the pill box')
  assert.equal(lensPillShape(pill, 80, 0, true).radius, 27, 'the corner never passes half the shorter side')
})

test('only liquid lenses magnify, and the ink copy never doubles real magnification', () => {
  assert.equal(lensMagnify(1, true), LENS_MAGNIFY)
  assert.equal(lensMagnify(0.5, true), LENS_MAGNIFY / 2)
  assert.equal(lensMagnify(1, false), 0)
  assert.equal(lensMagnify(2, true), LENS_MAGNIFY, 'clamped')
  assert.equal(lensInkZoom(1, true, false), 1 + LENS_MAGNIFY, 'stand-in where the glass cannot bend')
  assert.equal(lensInkZoom(1, true, true), 1, 'the glass magnifies: the copy does not')
  assert.equal(lensInkZoom(1, false, false), 1, 'transparent glass never magnifies')
})

test('magnification samples toward the centre by 1 / (1 + m)', () => {
  assert.deepEqual(magnifyOffset(50, 20, 50, 20, 0.2), { x: 0, y: 0 }, 'the centre stays')
  const o = magnifyOffset(62, 20, 50, 20, 0.2)
  assert.ok(Math.abs(50 + 12 / 1.2 - 62 - o.x) < 1e-9 && o.y === 0)
  assert.deepEqual(magnifyOffset(62, 30, 50, 20, 0), { x: 0, y: 0 })
})

test('the lens map bends at the rim and magnifies inside, in one linear scale', () => {
  const shape = { x: 0, y: 0, width: 80, height: 40, radius: 20 }
  const flat = lensDisplacementMap(shape, 0)
  const zoom = lensDisplacementMap(shape, LENS_MAGNIFY)
  assert.equal(zoom.width, 80)
  assert.equal(zoom.height, 40)
  assert.ok(zoom.scale > flat.scale, 'magnifying shifts further')
  const at = (map: typeof zoom, x: number, y: number) => {
    const i = (y * map.width + x) * 4
    return { dx: ((map.data[i] - 128) / 127) * (map.scale / 2), dy: ((map.data[i + 1] - 128) / 127) * (map.scale / 2), alpha: map.data[i + 3] }
  }
  // The flat middle: no bend without magnification; with it, it samples toward the centre.
  assert.equal(at(flat, 55, 20).dx, 0)
  const inner = at(zoom, 55, 20)
  const expected = magnifyOffset(55.5, 20.5, 40, 20, LENS_MAGNIFY).x
  assert.ok(Math.abs(inner.dx - expected) < zoom.scale / 254 + 1e-6, `${inner.dx} ≈ ${expected}`)
  assert.ok(inner.dx < 0)
  // The rim bends inward on top of that.
  assert.ok(at(flat, 79, 20).dx < 0 && at(zoom, 79, 20).dx < at(zoom, 70, 20).dx)
  // Alpha is the shape: inside opaque, the cut corner clear.
  assert.equal(at(zoom, 40, 20).alpha, 255)
  assert.equal(at(zoom, 0, 0).alpha, 0)
})

test('the lens material eases from the bare backdrop to clear glass', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const rest = lensMaterial(0, scheme)
    assert.deepEqual([rest.saturate, rest.gain, rest.offset, rest.k1, rest.k3], [1, 1, 0, 0, 0])
    assert.equal(rest.rim.w1, 0)
    assert.equal(rest.hairline.ring, 0)
    const glass = lensMaterial(1, scheme)
    const clear = glassMaterial(0, scheme, 'small')
    assert.equal(glass.gain, clear.gain)
    assert.equal(glass.offset, clear.offset)
    assert.equal(glass.saturate, clear.saturate)
    assert.equal(glass.rim.w1, glassRim(0, scheme).w1)
    assert.equal(glass.hairline.ring, glassHairline(0, scheme).ring)
    const half = lensMaterial(0.5, scheme)
    assert.ok(Math.abs(half.gain - (1 + clear.gain) / 2) < 1e-12)
  }
})
