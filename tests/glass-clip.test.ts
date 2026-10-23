import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clipAxes,
  clipInset,
  clippedGlassPaths,
  memberClip,
  openClip,
  scissorPath,
  type GlassRect,
  type GlassShape,
} from '../src/glass/geometry.ts'

const pill = (x: number): GlassShape => ({ x, y: 0, width: 86, height: 44, radius: 22, cornerExponent: 2 })
const points = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])

test('clip axes follow overflow, clip-path and contain', () => {
  assert.deepEqual(clipAxes({ overflowX: 'visible', overflowY: 'visible' }), { x: false, y: false, box: 'padding' })
  // overflow-x: auto computes overflow-y to auto too; overflow: clip may clip one axis only.
  assert.deepEqual(clipAxes({ overflowX: 'auto', overflowY: 'auto' }), { x: true, y: true, box: 'padding' })
  assert.deepEqual(clipAxes({ overflowX: 'clip', overflowY: 'visible' }), { x: true, y: false, box: 'padding' })
  assert.deepEqual(clipAxes({ overflowX: 'visible', overflowY: 'visible', clipPath: 'inset(0px)' }), { x: true, y: true, box: 'border' })
  assert.deepEqual(clipAxes({ overflowX: 'visible', overflowY: 'visible', contain: 'layout paint' }), { x: true, y: true, box: 'padding' })
  assert.deepEqual(clipAxes({ overflowX: 'hidden', overflowY: 'hidden', display: 'contents' }), { x: false, y: false, box: 'padding' })
})

test('a member clip is the intersection of its clipping ancestors', () => {
  assert.equal(memberClip([]), undefined)
  const strip: GlassRect = { x: 10, y: 0, width: 200, height: 44 }
  // A horizontal-only clip leaves the vertical axis open.
  const row = openClip({ x: 0, y: 5, width: 150, height: 10 }, { x: true, y: false })
  assert.deepEqual(memberClip([strip, row]), { x: 10, y: 0, width: 140, height: 44 })
  // Disjoint clips: scrolled out of view, an empty rect.
  const away = memberClip([strip, { x: 300, y: 0, width: 50, height: 44 }])!
  assert.equal(away.width, 0)
})

test('a scissored outline is cut straight at the clip edge', () => {
  const square = 'M0,0L100,0L100,100L0,100Z'
  const cut = scissorPath(square, { x: 0, y: 0, width: 60, height: 200 })
  assert.deepEqual(new Set(points(cut).map((p) => p.join(','))), new Set(['0,0', '60,0', '60,100', '0,100']))
  assert.ok(points(cut).filter(([x]) => x === 60).length >= 2, 'the cut is a straight edge at x = 60')
  assert.equal(scissorPath(square, { x: 200, y: 0, width: 10, height: 10 }), '')
  // Several loops (merged outlines with holes) are cut one by one.
  assert.equal(scissorPath(`${square}M200,0L300,0L300,100L200,100Z`, { x: 50, y: 0, width: 200, height: 100 }).split('M').length - 1, 2)
})

test('a lone bubble cut by a clip gets a CSS inset clip', () => {
  const box = { x: 196, y: 0, width: 86, height: 44 }
  assert.equal(clipInset(box, { x: 0, y: 0, width: 200, height: 44 }), 'inset(0px 82px 0px 0px)')
  assert.equal(clipInset(box, { x: 0, y: 0, width: 400, height: 44 }), '')
  assert.equal(clipInset(box), '')
})

test('clipped bubbles keep to their strip: hidden ones draw nothing, cut ones are cut', () => {
  // Five 86px pills 12px apart in a 200px strip scrolled by 250.
  const shapes = [0, 1, 2, 3, 4].map((i) => pill(i * 98 - 250))
  const strip: GlassRect = { x: 0, y: 0, width: 200, height: 44 }
  const paths = clippedGlassPaths(shapes, shapes.map(() => strip), 8)
  assert.equal(paths.length, 3)
  for (const path of paths) {
    assert.deepEqual(path.clip, strip)
    for (const [x] of points(path.visible)) assert.ok(x >= 0 && x <= 200, `${x} inside the strip`)
  }
  // The first visible pill (-54…32) keeps its whole outline for the rim and is cut for paint.
  const first = paths.find((path) => path.bounds.x < 0)!
  assert.ok(Math.min(...points(first.d).map(([x]) => x)) < 0)
  assert.equal(Math.min(...points(first.visible).map(([x]) => x)), 0)
  // A pill wholly inside the strip paints its plain outline.
  const middle = paths.find((path) => path.bounds.x > 0 && path.bounds.x + path.bounds.width < 200)!
  assert.equal(middle.visible, middle.d)
})

test('glass inside a clip never blends with glass outside it', () => {
  const inside = pill(0)
  const outside = pill(90) // 4px away: would merge with spacing 8
  const strip: GlassRect = { x: -10, y: -10, width: 120, height: 64 }
  assert.equal(clippedGlassPaths([inside, outside], [strip, undefined], 8).length, 2)
  assert.equal(clippedGlassPaths([inside, outside], [strip, strip], 8).length, 1)
  assert.equal(clippedGlassPaths([inside, outside], [undefined, undefined], 8).length, 1)
})
