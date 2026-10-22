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
import { DEFAULT_GLASS_LIGHT, glassLightToward, rimGradient } from '../src/glass/light.ts'

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

test('the rim gradient spans the bounds along the light, lit end first', () => {
  const g = rimGradient({ x: 0, y: 0, width: 100, height: 40 }, DEFAULT_GLASS_LIGHT)
  assert.ok(g.x1 < g.x2 && g.y1 < g.y2)
  assert.ok(near(g.x1 + g.x2, 100, 1e-9))
  // Like CSS: the projection of the bounds onto the gradient line.
  assert.ok(near(Math.hypot(g.x2 - g.x1, g.y2 - g.y1), (100 + 40) * Math.SQRT1_2, 1e-9))
})
