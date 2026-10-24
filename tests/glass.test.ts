import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clusterPath,
  glassClusters,
  glassPaths,
  loopArea,
  shapeDistance,
  shapePath,
  smoothMin,
  unionDistance,
  unionLoops,
  type GlassShape,
} from '../src/glass/geometry.ts'
import { planGlassTransition, sameRect } from '../src/glass/transitions.ts'
import { DEFAULT_GLASS_LIGHT, glassLightToward } from '../src/glass/light.ts'

const pill = (x: number, width = 80, y = 0): GlassShape => ({ x, y, width, height: 46, radius: 23 })
const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance

test('distance is negative inside, zero on the outline and positive outside', () => {
  const shape = pill(0)
  assert.ok(shapeDistance(40, 23, shape) < 0)
  assert.ok(near(shapeDistance(40, 0, shape), 0, 1e-9))
  assert.ok(near(shapeDistance(40, -10, shape), 10, 1e-9))
  assert.ok(near(shapeDistance(90, 23, shape), 10, 1e-9))
})

test('the corner outline is the kit superellipse, not a circle', () => {
  const shape: GlassShape = { x: 0, y: 0, width: 200, height: 100, radius: 30 }
  const path = shapePath(shape)
  const corner = [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
  for (const [x, y] of corner) assert.ok(Math.abs(shapeDistance(x, y, shape)) < 0.02, `${x},${y}`)
})

test('shapePath matches the shape at its offset', () => {
  const path = shapePath({ x: 100, y: 20, width: 80, height: 46, radius: 23 })
  assert.match(path, /^M123,20L/)
})

test('smoothMin is the plain minimum when values are far apart or k is 0', () => {
  assert.equal(smoothMin(1, 10, 4), 1)
  assert.equal(smoothMin(3, 5, 0), 3)
  assert.ok(smoothMin(3, 3, 4) < 3)
  assert.equal(smoothMin(3, 3, 4), 2)
})

test('bubbles farther apart than spacing stay separate clusters with exact outlines', () => {
  const shapes = [pill(0), pill(92)]
  assert.equal(glassClusters(shapes, 8).length, 2)
  const paths = glassPaths(shapes, 8)
  assert.deepEqual(
    paths.map((p) => p.d),
    shapes.map(shapePath)
  )
})

test('bubbles closer than spacing blend into one cluster', () => {
  assert.equal(glassClusters([pill(0), pill(86)], 8).length, 1)
})

test('a gap below spacing / 2 joins the outlines into one loop', () => {
  const loops = unionLoops([pill(0), pill(83)], 8)
  assert.equal(loops.length, 1)
})

test('a gap between spacing / 2 and spacing bends outlines but keeps two loops', () => {
  const loops = unionLoops([pill(0), pill(86)], 8)
  assert.equal(loops.length, 2)
  // Bent toward each other: the right edge of the first pill moved past x = 80 at mid height.
  const rightmost = Math.max(...loops.flatMap((loop) => loop.filter(([, y]) => near(y, 23, 6)).map(([x]) => x)).filter((x) => x < 84))
  assert.ok(rightmost > 80, String(rightmost))
})

test('overlapping bubbles become one loop covering both', () => {
  const loops = unionLoops([pill(0), pill(60)], 8)
  assert.equal(loops.length, 1)
  const xs = loops[0].map(([x]) => x)
  assert.ok(near(Math.min(...xs), 0, 1.5))
  assert.ok(near(Math.max(...xs), 140, 1.5))
})

test('every loop keeps the inside on its left, so outlines wind one way and holes the other', () => {
  // A ring of four bars leaves a hole in the middle.
  const bars: GlassShape[] = [
    { x: 0, y: 0, width: 120, height: 20, radius: 6 },
    { x: 0, y: 100, width: 120, height: 20, radius: 6 },
    { x: 0, y: 0, width: 20, height: 120, radius: 6 },
    { x: 100, y: 0, width: 20, height: 120, radius: 6 },
  ]
  const loops = unionLoops(bars, 4)
  assert.equal(loops.length, 2)
  const signs = loops.map((loop) => Math.sign(loopArea(loop)))
  assert.notEqual(signs[0], signs[1])
})

test('union area is close to the sum of two separate bubbles', () => {
  const shapes = [pill(0), pill(83)]
  const area = Math.abs(loopArea(unionLoops(shapes, 8)[0]))
  const single = Math.abs(loopArea(unionLoops([pill(0)], 8)[0]))
  assert.ok(area > single * 2 && area < single * 2.2, `${area} vs ${single}`)
})

test('unionDistance with one shape is that shape', () => {
  assert.equal(unionDistance(10, 10, [pill(0)], 8), shapeDistance(10, 10, pill(0)))
})

test('clusterPath of one shape is its exact outline', () => {
  assert.equal(clusterPath([pill(10)], 8), shapePath(pill(10)))
})

const map = (entries: [string, GlassShape][]) => new Map(entries)

test('splitting: new bubbles grow out of the bubble that left', () => {
  const plan = planGlassTransition(map([['pair', pill(0, 172)]]), map([['a', pill(0)], ['b', pill(92)]]), 8)
  assert.deepEqual(
    plan.births.map((b) => [b.id, b.kind, b.kind === 'grow' ? b.source : null]),
    [
      ['a', 'grow', 'pair'],
      ['b', 'grow', 'pair'],
    ]
  )
  assert.equal(plan.deaths[0].kind, 'absorb')
})

test('merging: leaving bubbles are absorbed into the new one', () => {
  const plan = planGlassTransition(map([['a', pill(0)], ['b', pill(92)]]), map([['pair', pill(0, 172)]]), 8)
  assert.deepEqual(plan.births.map((b) => b.kind), ['grow'])
  assert.deepEqual(
    plan.deaths.map((d) => [d.id, d.kind, d.kind === 'absorb' ? d.target : null]),
    [
      ['a', 'absorb', 'pair'],
      ['b', 'absorb', 'pair'],
    ]
  )
})

test('far bubbles materialize and dematerialize instead of morphing', () => {
  const plan = planGlassTransition(map([['old', pill(0)]]), map([['new', pill(400)]]), 8)
  assert.deepEqual(plan.births, [{ id: 'new', kind: 'materialize' }])
  assert.deepEqual(plan.deaths, [{ id: 'old', kind: 'dematerialize' }])
})

test('a new bubble next to a living one grows out of it', () => {
  const plan = planGlassTransition(map([['a', pill(0)]]), map([['a', pill(0)], ['b', pill(84)]]), 8)
  assert.deepEqual(plan.births.map((b) => [b.kind, b.kind === 'grow' ? b.source : '']), [['grow', 'a']])
  assert.deepEqual(plan.deaths, [])
})

test('sameRect tolerates sub-pixel noise', () => {
  assert.ok(sameRect(pill(0), { ...pill(0), x: 0.3 }))
  assert.ok(!sameRect(pill(0), pill(1)))
})

test('light defaults to the top-left and turns toward a near pointer', () => {
  assert.deepEqual(glassLightToward({ x: 0, y: 0 }, null), DEFAULT_GLASS_LIGHT)
  const right = glassLightToward({ x: 0, y: 0 }, { x: 40, y: 0 })
  assert.ok(right.x > DEFAULT_GLASS_LIGHT.x)
  assert.ok(near(Math.hypot(right.x, right.y), 1, 1e-9))
  const far = glassLightToward({ x: 0, y: 0 }, { x: 5000, y: 0 })
  assert.ok(near(far.x, DEFAULT_GLASS_LIGHT.x, 0.01))
})

import { GLASS_STRETCH_LIMIT, glassStretch, pressedShape } from '../src/glass/press.ts'

test('a press swells the bubble around its centre', () => {
  const shape = pill(100)
  const pressed = pressedShape(shape, 1.1, 0, 0)
  assert.ok(near(pressed.x + pressed.width / 2, shape.x + shape.width / 2, 1e-9))
  assert.ok(near(pressed.width, shape.width * 1.1, 1e-9))
  assert.ok(near(pressed.radius, shape.radius * 1.1, 1e-9))
})

test('a drag stretches the bubble toward the finger and narrows it across', () => {
  const shape = pill(0)
  const pressed = pressedShape(shape, 1, 8, 0)
  assert.ok(pressed.width > shape.width && pressed.height < shape.height)
  assert.ok(pressed.x + pressed.width > shape.x + shape.width, 'grows on the drag side')
  assert.ok(near(pressed.x, shape.x, 1e-9), 'the far edge stays put')
})

test('stretch resists and never passes its limit', () => {
  const small = glassStretch(10, 0)
  const large = glassStretch(2000, 0)
  assert.ok(small.x > 0 && small.x < 10)
  assert.ok(large.x < GLASS_STRETCH_LIMIT && large.x > GLASS_STRETCH_LIMIT * 0.9)
  assert.ok(glassStretch(-50, 0).x < 0)
  assert.equal(glassStretch(0, 0).y, 0)
})

import { adaptiveGlassTone, backdropTone, parseCssColor } from '../src/glass/adaptive.ts'

test('computed colours parse in rgb, rgba and color(srgb) forms', () => {
  assert.deepEqual(parseCssColor('rgb(255, 0, 0)'), { r: 1, g: 0, b: 0, a: 1 })
  assert.equal(parseCssColor('rgba(0, 0, 0, 0)')!.a, 0)
  assert.equal(parseCssColor('rgb(0 0 0 / 50%)')!.a, 0.5)
  assert.deepEqual(parseCssColor('color(srgb 0.5 0.25 1 / 0.8)'), { r: 0.5, g: 0.25, b: 1, a: 0.8 })
  assert.equal(parseCssColor('transparent'), null)
})

test('a named region wins over colours, then the first solid colour decides', () => {
  assert.equal(backdropTone([{ color: 'rgb(255, 255, 255)' }, { tone: 'dark' }]), 'light')
  assert.equal(backdropTone([{ tone: 'dark' }, { color: 'rgb(255, 255, 255)' }]), 'dark')
  assert.equal(backdropTone([{ color: 'rgba(0, 0, 0, 0)' }, { color: 'rgb(16, 30, 23)' }]), 'dark')
  assert.equal(backdropTone([{ color: 'rgb(128, 128, 128)' }]), null, 'mid grey is undecided')
  assert.equal(backdropTone([]), null)
})

test('only small glass flips, only on agreement, only against the color mode', () => {
  assert.equal(adaptiveGlassTone(['dark', 'dark'], 'light', 46), 'dark')
  assert.equal(adaptiveGlassTone(['dark', 'dark'], 'dark', 46), null, 'already dark')
  assert.equal(adaptiveGlassTone(['dark', 'light'], 'light', 46), null, 'disagreement')
  assert.equal(adaptiveGlassTone(['dark'], 'light', 200), null, 'large glass does not flip')
  assert.equal(adaptiveGlassTone([null], 'light', 46), null)
  assert.equal(adaptiveGlassTone(['light'], 'dark', 46), 'light')
})

import { GLASS_BEZEL, displacementMap, refractionAt } from '../src/glass/refraction.ts'

test('refraction bends only the bevel, strongest at the edge, toward the inside', () => {
  assert.deepEqual(refractionAt(2, 1, 0), { x: 0, y: 0 }, 'outside')
  assert.deepEqual(refractionAt(-GLASS_BEZEL, 1, 0), { x: 0, y: 0 }, 'flat middle')
  const edge = refractionAt(-0.5, 1, 0)
  const deeper = refractionAt(-GLASS_BEZEL / 2, 1, 0)
  assert.ok(edge.x < 0 && deeper.x < 0, 'pulls inward against an outward normal')
  assert.ok(Math.abs(edge.x) > Math.abs(deeper.x), 'fades across the bezel')
  assert.ok(Math.abs(edge.x) <= 1)
})

test('the displacement map is neutral outside and in the middle, shifted on the rim', () => {
  const pillShape = { x: 10, y: 10, width: 120, height: 46, radius: 23 }
  const map = displacementMap(140, 66, [[pillShape]], 8)
  const at = (x: number, y: number) => [map.data[(y * map.width + x) * 4], map.data[(y * map.width + x) * 4 + 1]]
  assert.deepEqual(at(2, 2), [128, 128], 'outside')
  assert.deepEqual(at(70, 33), [128, 128], 'flat middle')
  const left = at(11, 33)
  const right = at(128, 33)
  assert.ok(left[0] > 128, 'left rim samples further right (inward)')
  assert.ok(right[0] < 128, 'right rim samples further left (inward)')
  const alpha = (x: number, y: number) => map.data[(y * map.width + x) * 4 + 3]
  assert.equal(alpha(2, 2), 0, 'outside the glass is masked out')
  assert.equal(alpha(70, 33), 255, 'inside is kept')
})

import { hostFrame, toLocalPoint, toLocalRect, toScreenPoint } from '../src/glass/geometry.ts'
import { movesGeometry } from '../src/glass/scene.ts'

test('a container scaled by an ancestor measures bubbles in its own pixels', () => {
  // A 400×100 container drawn at half size (a zoomed-out demo frame) at (50, 20).
  const frame = hostFrame({ left: 50, top: 20, width: 200, height: 50 }, 400, 100)
  assert.equal(frame.scaleX, 0.5)
  assert.deepEqual(toLocalRect(frame, { left: 60, top: 25, width: 40, height: 23 }), { x: 20, y: 10, width: 80, height: 46 })
  const point = toLocalPoint(frame, 150, 45)
  assert.deepEqual(toScreenPoint(frame, point.x, point.y), { x: 150, y: 45 })
})

test('an unscaled or empty container keeps a scale of 1', () => {
  assert.deepEqual(hostFrame({ left: 0, top: 0, width: 300, height: 40 }, 300, 40), { left: 0, top: 0, scaleX: 1, scaleY: 1 })
  assert.equal(hostFrame({ left: 0, top: 0, width: 0, height: 0 }, 0, 0).scaleX, 1)
})

test('only running animations that move or resize count as geometry', () => {
  const transition = (property: string, playState = 'running') => ({ playState, transitionProperty: property }) as unknown as Animation
  const keyframes = (frames: Record<string, unknown>[]) => ({ playState: 'running', effect: { getKeyframes: () => frames } }) as unknown as Animation
  assert.equal(movesGeometry(transition('translate')), true)
  assert.equal(movesGeometry(transition('all')), true)
  assert.equal(movesGeometry(transition('opacity')), false)
  assert.equal(movesGeometry(transition('transform', 'finished')), false)
  assert.equal(movesGeometry(keyframes([{ offset: 0, opacity: 0 }, { offset: 1, opacity: 1 }])), false, 'our fade-in')
  assert.equal(movesGeometry(keyframes([{ offset: 0, transform: 'scale(0.9)' }])), true)
  assert.equal(movesGeometry(keyframes([{ offset: 0, maxHeight: '0px' }])), true)
})

import { webRefractionShift, refractionScale } from '../src/glass/refraction.ts'
import { GLASS_BLUR, GLASS_CLEAR_BLUR, GLASS_RIM, edgeMask, glassBlur, glassBlurAt, glassEdgeTerms, glassMaterial, glassRim, glassSize, rimLayer } from '../src/glass/material.ts'
import { mergeWidth } from '../src/glass/geometry.ts'

test('the bend follows the fitted profile: (1 - t)^4 of the bezel, smaller glass scales down', () => {
  assert.ok(Math.abs(refractionAt(-1e-6, 1, 0).x + 1) < 1e-4, 'full shift at the edge')
  assert.ok(Math.abs(refractionAt(-GLASS_BEZEL / 2, 1, 0).x + 0.0625) < 1e-9, 'half way: 1/16')
  assert.equal(refractionScale(200), 1)
  assert.equal(refractionScale(88), 1)
  assert.ok(Math.abs(refractionScale(44) - 0.5 ** 0.78) < 1e-9)
  const small = displacementMap(60, 60, [[{ x: 8, y: 8, width: 44, height: 44, radius: 22 }]], 8)
  assert.ok(Math.abs(small.scale - 2 * webRefractionShift(44)) < 1e-9, 'filter scale follows the size')
})

test('material: denser control glass, blur grows with size, clear glass always softens a little', () => {
  assert.equal(glassSize(44), 'small')
  assert.equal(glassSize(72), 'small')
  assert.equal(glassSize(120), 'large')
  assert.equal(glassBlur(30), GLASS_BLUR.min)
  assert.equal(glassBlur(400), GLASS_BLUR.max)
  assert.ok(glassBlur(100) > GLASS_BLUR.min && glassBlur(100) < GLASS_BLUR.max)
  assert.equal(glassBlurAt(44, 0, false), GLASS_CLEAR_BLUR)
  assert.equal(glassBlurAt(44, 0, true), GLASS_CLEAR_BLUR)
  assert.equal(glassBlurAt(44, 1, false), 0)
  assert.equal(glassBlurAt(200, 1, true), glassBlur(200))
  assert.ok(near(glassBlurAt(44, 0.5, false), GLASS_CLEAR_BLUR / 2, 1e-12))
})

test('rim: a white layer inside the outline, lit at both ends, flat then gone by its width', () => {
  for (const scheme of ['light', 'dark'] as const) for (const tint of [0, 0.5, 1]) {
    const rim = glassRim(tint, scheme)
    assert.equal(rimLayer(0, 1, rim), rim.w0 + rim.w1, 'lit end')
    assert.equal(rimLayer(0, -1, rim), rim.w0 + rim.w1, 'both ends')
    assert.equal(rimLayer(0, 0, rim), rim.w0, 'perpendicular')
    assert.equal(rimLayer(-0.01, 1, rim), 0, 'nothing outside')
    assert.equal(rimLayer(rim.width, 1, rim), 0)
    let previous = rimLayer(0, 1, rim)
    for (let i = 1; i <= 100; i++) {
      const alpha = rimLayer((i / 100) * rim.width, 1, rim)
      assert.ok(alpha <= previous && alpha >= 0)
      previous = alpha
    }
    // Flat top: still ≥ 70 % of the peak two thirds of the way in.
    assert.ok(rimLayer(rim.width * 2 / 3, 1, rim) >= 0.7 * (rim.w0 + rim.w1))
  }
  // Measured ends (LIGHT-EDGES.md): clear light 0.66 at the lit ends, near nothing across.
  assert.ok(near(rimLayer(0, 1, glassRim(0, 'light')), 0.66, 1e-9))
  assert.ok(rimLayer(0, 0, glassRim(0, 'light')) < 0.05)
  assert.deepEqual(glassRim(1, 'light'), GLASS_RIM.light.regular)
  assert.deepEqual(glassRim(0, 'dark'), GLASS_RIM.dark.clear)
})

test('edge terms: the veil thins at the edge, dark clear glass adds light that scales with the backdrop', () => {
  assert.equal(edgeMask(-0.1, 1), 0)
  assert.equal(edgeMask(0, 1), 1)
  assert.ok(near(edgeMask(0, 0), 0.2, 1e-12))
  assert.equal(edgeMask(1, 1), 0)
  const regular = glassMaterial(1, 'light', 'small')
  const light = glassEdgeTerms(1, 'light', regular, 0.99)
  // x + k1·x·E + k3·E under veil v reproduces a veil thinned by K = 0.35 at E = 1.
  const v = regular.veil
  for (const x of [0.2, 0.6, 0.9]) {
    const filtered = x + light.k1 * x + light.k3
    const shown = v * 0.99 + (1 - v) * filtered
    const target = v * (1 - 0.35) * 0.99 + (1 - v * (1 - 0.35)) * x
    assert.ok(near(shown, target, 1e-9), `x ${x}`)
  }
  const clear = glassEdgeTerms(0, 'light', glassMaterial(0, 'light', 'small'), 0.99)
  assert.deepEqual(clear, { k1: 0, k3: 0 })
  const darkClear = glassEdgeTerms(0, 'dark', glassMaterial(0, 'dark', 'small'), 0.13)
  assert.ok(near(darkClear.k1, 0.31, 1e-12) && near(darkClear.k3, 0.106, 1e-12))
})

test('merging: full spacing while apart, a slimmer blend as shapes touch', () => {
  assert.equal(mergeWidth(22, 40), 40)
  assert.equal(mergeWidth(40, 40), 40)
  assert.ok(Math.abs(mergeWidth(0, 40) - 26) < 1e-9)
  assert.equal(mergeWidth(5, 0), 0)
  // Two 64px bubbles 16px apart in a 40px container join, with a slimmer neck than a constant blend.
  const a = { x: 0, y: 0, width: 64, height: 64, radius: 32 }
  const b = { x: 80, y: 0, width: 64, height: 64, radius: 32 }
  const neckOf = (distance: (y: number) => number) => {
    let neck = 0
    for (let y = 0; y <= 32; y += 0.25) if (distance(32 - y) <= 0) neck = y
    return neck
  }
  const neck = neckOf((y) => unionDistance(72, y, [a, b], 40))
  const constant = neckOf((y) => smoothMin(shapeDistance(72, y, a), shapeDistance(72, y, b), 40))
  assert.ok(neck > 4 && neck < constant - 2, `neck ${neck} vs ${constant}`)
})


import { surfaceReflection, highlightSurface } from '../src/glass/light.ts'

test('convex highlight has a finite soft band and a weaker opposite reflection', () => {
  const light = { x: 0, y: -1 }
  assert.equal(surfaceReflection(0, 0, -1, light), 0)
  assert.equal(surfaceReflection(5, 0, -1, light), 0)
  assert.equal(surfaceReflection(9, 0, -1, light), 0)
  const band = Array.from({ length: 51 }, (_, i) => surfaceReflection(i / 10, 0, -1, light))
  const peak = Math.max(...band)
  assert.ok(peak > 0.8)
  assert.ok(band.indexOf(peak) > 2 && band.indexOf(peak) < 30)
  assert.ok(band.filter(v => v > 0.1).length > 10)
  assert.ok(surfaceReflection(1, 0, 1, light) < surfaceReflection(1, 0, -1, light) * 0.7)
  assert.ok(surfaceReflection(1, 1, 0, light) < 0.01)
})

test('highlight samples stay within the blended bevel and remain finite at merge necks', () => {
  const shapes = [{ x: 0, y: 0, width: 48, height: 48, radius: 24 }, { x: 52, y: 0, width: 48, height: 48, radius: 24 }]
  const field = highlightSurface(shapes, 16, { x: 0, y: 0, width: 100, height: 48 })
  assert.ok(field.samples.length > 0)
  assert.ok(field.samples.every(s => s.depth >= 0 && s.depth < field.bezel && Number.isFinite(surfaceReflection(s.depth, s.nx, s.ny, DEFAULT_GLASS_LIGHT))))
})


test('web bezel transport never reverses straight background lines', () => {
  for (const side of [28, 44, 88, 180]) {
    const shape = { x: 0, y: 0, width: 240, height: side, radius: 12 }
    const map = displacementMap(240, side, [[shape]], 8)
    let previous = -Infinity
    for (let y = 0; y < side / 2; y++) {
      const green = map.data[(y * map.width + 120) * 4 + 1]
      const sampled = y + 0.5 + (green / 255 - 0.5) * map.scale
      assert.ok(sampled > previous, `fold at depth ${y} in ${side}px glass`)
      previous = sampled
    }
  }
})


import { surfaceShade } from '../src/glass/light.ts'
test('inner bevel shade belongs to the unlit side and fades at both boundaries', () => {
  const light = { x: 0, y: -1 }
  assert.equal(surfaceShade(0, 0, 1, light), 0)
  assert.equal(surfaceShade(5, 0, 1, light), 0)
  assert.equal(surfaceShade(2.5, 0, -1, light), 0)
  assert.ok(surfaceShade(2.5, 0, 1, light) > 0.5)
  assert.equal(surfaceShade(2, 0, 0, light), 0)
})


import { elementImagePlacement } from '../src/glass/refraction.ts'
test('Firefox live source landmarks stay aligned through scaled hosts and inset pieces', () => {
  const frame = { left: 100, top: 200, scaleX: 0.5, scaleY: 0.75 }
  const screenSource = { left: 80, top: 170, width: 300, height: 225 }
  const source = toLocalRect(frame, screenSource)
  const piece = { x: 52, y: 60, width: 100, height: 50 }
  const image = elementImagePlacement({ ...source, x: source.x + 32, y: source.y + 32 }, piece)
  for (const [px, py] of [[0, 0], [40, 20], [99, 49]]) {
    const sampledX = screenSource.left + (px - image.x) * frame.scaleX
    const sampledY = screenSource.top + (py - image.y) * frame.scaleY
    assert.equal(sampledX, frame.left + (piece.x - 32 + px) * frame.scaleX)
    assert.equal(sampledY, frame.top + (piece.y - 32 + py) * frame.scaleY)
  }
  assert.equal(image.width * frame.scaleX, screenSource.width)
  assert.equal(image.height * frame.scaleY, screenSource.height)
})


test('full-radius glass is a circle at every angle, round or clamped continuous', () => {
  const circle = { x: 0, y: 0, width: 72, height: 72, radius: 36, cornerExponent: 2 }
  for (const shape of [circle, { ...circle, cornerExponent: undefined }])
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 16) {
      const x = 36 + 36 * Math.cos(angle)
      const y = 36 + 36 * Math.sin(angle)
      assert.ok(Math.abs(shapeDistance(x, y, shape)) < 1e-8)
    }
  // A smaller radius keeps the continuous corner: fuller than a circular one at the diagonal.
  const card = { x: 0, y: 0, width: 300, height: 200, radius: 16 }
  const diagonal = 16 - 16 / Math.sqrt(2)
  assert.ok(Math.abs(shapeDistance(diagonal, diagonal, { ...card, cornerExponent: 2 })) < 1e-8)
  assert.ok(shapeDistance(diagonal, diagonal, card) < -1)
  assert.equal(pressedShape(circle, 1.06, 3, 0).cornerExponent, 2)
})

test('round glass corner radius follows its full visible range and clamps at a capsule', () => {
  const shape = { x: 0, y: 0, width: 180, height: 72, radius: 0, cornerExponent: 2 }
  const distances = [0, 0.25, 0.5, 0.75, 1].map(value => shapeDistance(2, 2, { ...shape, radius: 36 * value }))
  assert.ok(distances.every((value, index) => index === 0 || value > distances[index - 1]))
  assert.equal(shapeDistance(2, 2, { ...shape, radius: 36 }), shapeDistance(2, 2, { ...shape, radius: 100 }))
})


test('measured lens restores native shift while preserving gentle default and shape coverage', () => {
  const shapes = [[{ x: 0, y: 0, width: 88, height: 88, radius: 44, cornerExponent: 2 }]]
  const gentle = displacementMap(88, 88, shapes, 0)
  const measured = displacementMap(88, 88, shapes, 0, undefined, 'measured')
  assert.equal(measured.scale, 94)
  assert.ok(measured.scale > gentle.scale * 8)
  for (let i = 3; i < measured.data.length; i += 4) assert.equal(measured.data[i], gentle.data[i])
  const small = displacementMap(44, 44, [[{ x: 0, y: 0, width: 44, height: 44, radius: 22 }]], 0, undefined, 'measured')
  assert.ok(Math.abs(small.scale - 94 * refractionScale(44)) < 1e-9)
})
