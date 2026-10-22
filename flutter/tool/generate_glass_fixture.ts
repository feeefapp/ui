/**
 * Writes flutter/test/fixtures/glass.json from the web kit's glass geometry and light, so the Dart
 * twin is tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_glass_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import {
  shapeDistance,
  smoothMin,
  unionDistance,
  rectGap,
  glassClusters,
  unionLoops,
  loopArea,
  clampRadius,
  type GlassShape,
} from '../../src/glass/geometry'
import { glassLightToward, rimGradient, DEFAULT_GLASS_LIGHT } from '../../src/glass/light'
import { SPRINGS, solveSpring, springCoefficients, rubberBand } from '../../src/physics/spring'
import { glassStretch, pressedShape } from '../../src/glass/press'
import { planGlassTransition } from '../../src/glass/transitions'
import { swipeRelease, swipeIsFull, reorderTarget, reorderShifts, reorderLanding } from '../../src/primitives/list-model'
import { parseNumberExpression, stepDecimals, clampNumber, dragValue, keyValue, fillFraction } from '../../src/primitives/number-field-core'
import { computeActionsLayout } from '../../src/actions/layout'
import { diffVisibleActions } from '../../src/actions/overflow-motion'
import { scrollWashPaths, scrollEdgeOpacities, scrollContentReserve } from '../../src/scroll/metrics'

const pill: GlassShape = { x: 10, y: 20, width: 120, height: 46, radius: 23 }
const square: GlassShape = { x: 0, y: 0, width: 40, height: 40, radius: 12 }
const points: [number, number][] = [
  [0, 0], [10, 20], [70, 43], [130, 43], [140, 43], [12, 22], [128, 64], [70, 10], [5, 50], [140, 70],
]
const pairs: { a: GlassShape; b: GlassShape; spacing: number }[] = [
  { a: { x: 0, y: 0, width: 80, height: 44, radius: 22 }, b: { x: 86, y: 0, width: 44, height: 44, radius: 22 }, spacing: 12 },
  { a: { x: 0, y: 0, width: 80, height: 44, radius: 22 }, b: { x: 100, y: 0, width: 44, height: 44, radius: 22 }, spacing: 12 },
  { a: { x: 0, y: 0, width: 60, height: 60, radius: 20 }, b: { x: 50, y: 30, width: 60, height: 60, radius: 20 }, spacing: 8 },
]
const fixture = {
  distance: [pill, square].map((shape) => ({
    shape,
    clamped: clampRadius(shape),
    samples: points.map(([x, y]) => [x, y, shapeDistance(x, y, shape)]),
  })),
  smoothMin: [[1, 2, 4], [1, 9, 4], [-3, -2.5, 8], [0, 0, 6], [5, 1, 0]].map(([a, b, k]) => [a, b, k, smoothMin(a, b, k)]),
  union: pairs.map(({ a, b, spacing }) => ({
    a,
    b,
    spacing,
    gap: rectGap(a, b),
    clusters: glassClusters([a, b], spacing).length,
    samples: points.map(([x, y]) => [x, y, unionDistance(x, y, [a, b], spacing)]),
    loops: unionLoops([a, b], spacing, 2).map((loop) => ({ points: loop.length, area: loopArea(loop), first: loop[0] })),
  })),
  light: [
    { centre: { x: 100, y: 100 }, pointer: null },
    { centre: { x: 100, y: 100 }, pointer: { x: 400, y: 100 } },
    { centre: { x: 100, y: 100 }, pointer: { x: 100, y: 101 } },
    { centre: { x: 0, y: 0 }, pointer: { x: -50, y: 300 } },
  ].map(({ centre, pointer }) => ({ centre, pointer, light: glassLightToward(centre, pointer) })),
  rim: [
    { bounds: { x: 0, y: 0, width: 200, height: 46 }, light: DEFAULT_GLASS_LIGHT },
    { bounds: { x: 10, y: 5, width: 50, height: 120 }, light: { x: 0.6, y: -0.8 } },
  ].map(({ bounds, light }) => ({ bounds, light, gradient: rimGradient(bounds, light) })),
}
writeFileSync(new URL('../test/fixtures/glass.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n')
console.log('wrote glass.json')

// Springs and press response, shared by the glass engine.
const springs = Object.entries(SPRINGS).map(([name, spring]) => {
  const at = solveSpring(spring, 0, 100, 40)
  return { name, coefficients: springCoefficients(spring), samples: [0, 0.05, 0.1, 0.2, 0.35, 0.6, 1].map((t) => [t, at(t).position, at(t).velocity]) }
})
const overdamped = solveSpring({ duration: 0.5, bounce: -0.4 }, 10, -5, 0)
const motion = {
  springs,
  overdamped: [0, 0.1, 0.3, 0.8].map((t) => [t, overdamped(t).position, overdamped(t).velocity]),
  rubberBand: [[0, 100], [10, 100], [-40, 100], [500, 48], [3, 0]].map(([o, d]) => [o, d, rubberBand(o, d)]),
  stretch: [[0, 0], [20, -8], [-300, 120]].map(([dx, dy]) => [dx, dy, glassStretch(dx, dy)]),
  pressed: pressedShape({ x: 10, y: 10, width: 100, height: 40, radius: 20 }, 1.06, 6, -3),
  plan: (() => {
    const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })
    const previous = new Map([['pair', r(0, 0, 120, 44)], ['far', r(400, 0, 44, 44)]])
    const next = new Map([['left', r(0, 0, 56, 44)], ['right', r(64, 0, 56, 44)], ['new', r(250, 0, 44, 44)]])
    return planGlassTransition(previous, next, 12)
  })(),
}
writeFileSync(new URL('../test/fixtures/motion.json', import.meta.url), JSON.stringify(motion, null, 1) + '\n')
console.log('wrote motion.json')

// Scroll washes and edge opacities.
const washLevels = (columns: number, rows: number) => {
  const grid = Array.from({ length: columns * rows }, () => 0)
  scrollWashPaths(columns, rows).forEach((d, level) => {
    for (const [, x, y] of d.matchAll(/M(\d+) (\d+)/g)) grid[Number(y) * columns + Number(x)] = level
  })
  return grid
}
const scroll = {
  wash: [[12, 5], [40, 13], [3, 1]].map(([c, r]) => ({ columns: c, rows: r, levels: washLevels(c, r) })),
  edges: [[0, 0], [0, 500], [40, 500], [500, 500], [-20, 500], [700, 500], [10, 1]].map(([o, e]) => [o, e, scrollEdgeOpacities(o, e)]),
  reserve: [[0, 12, 24], [52, 12, 24], [52, -3, 24]].map(([h, g, p]) => [h, g, p, scrollContentReserve(h, g, p)]),
}
writeFileSync(new URL('../test/fixtures/scroll.json', import.meta.url), JSON.stringify(scroll) + '\n')
console.log('wrote scroll.json')

// List rows: swipe landings and reorder targets.
const sides = { leading: 76, trailing: 152, row: 360, fullLeading: true, fullTrailing: true }
const list = {
  release: [[10, 0], [50, 0], [30, 800], [-90, 0], [-60, -900], [250, 0], [-250, 0], [-250, 0, false]].map(
    ([o, v, full]) => {
      const s = { ...sides, fullTrailing: full !== false }
      return [o, v, full !== false, swipeRelease(o as number, v as number, s), swipeIsFull(o as number, s)]
    }
  ),
  reorder: [[0, 30], [0, 90], [2, -70], [3, 0], [1, 200]].map(([from, delta]) => {
    const heights = [56, 64, 56, 72]
    const to = reorderTarget(heights, from, delta)
    return [from, delta, to, reorderShifts(heights, from, to), reorderLanding(heights, from, to)]
  }),
}
writeFileSync(new URL('../test/fixtures/list.json', import.meta.url), JSON.stringify(list) + '\n')
console.log('wrote list.json')

// Actions: which entries fit.
const fit = (widths: number[], priorities: number[], maxWidth: number) => {
  const actions = widths.map((w, i) => ({ id: `a${i}`, priority: priorities[i], w }))
  const layout = computeActionsLayout({ actions, maxWidth, measure: (a) => a.w, overflowWidth: 40, gap: 4 })
  return { widths, priorities, maxWidth, visible: layout.visible.map((a) => a.id), overflow: layout.overflow.map((a) => a.id), requiredWidth: layout.requiredWidth }
}
const actionsFixture = {
  layouts: [
    fit([80, 60, 90], [0, 0, 0], 400),
    fit([80, 60, 90], [0, 0, 0], 200),
    fit([80, 60, 90], [2, 0, 1], 150),
    fit([80, 60, 90], [0, 0, 0], 10),
    fit([], [], 100),
  ],
  diff: diffVisibleActions(['a', 'b', 'c'], ['a', 'c', 'd']),
}
writeFileSync(new URL('../test/fixtures/actions.json', import.meta.url), JSON.stringify(actionsFixture) + '\n')
console.log('wrote actions.json')

// Number field: parsing, clamping, scrubbing and keys.
const nb = { min: 0, max: 100, step: 5 }
const open = { step: 0.25 }
const numbers = {
  parse: ['12', '1,5', '1,250.75', '2000*15%', '(3+4)*2', '10 / 4', '−3', '٣٫', '١٢٣', '2e3', 'abc', '', '1+', '3×4÷2', '50%'].map((t) => [t, parseNumberExpression(t)]),
  decimals: [1, 0.25, 0.1, 0.001, 1e-7, 5].map((s) => [s, stepDecimals(s)]),
  clamp: [[37, nb], [-4, nb], [1e9, nb], [1.13, open], [Number.NaN, nb], [7.3, { min: 2, step: 0.5 }], [7.3, { max: 2, step: 0.5 }]].map(([v, b]) => [v, b, clampNumber(v as number, b as never)]),
  drag: [
    [{ ...nb, startValue: 50, dx: 20, width: 200 }],
    [{ ...nb, startValue: 50, dx: 20, width: 200, fine: true }],
    [{ ...nb, startValue: 50, dx: 20, width: 200, rtl: true }],
    [{ ...open, startValue: 1, dx: 33, width: 200 }],
  ].map(([o]) => [o, dragValue(o as never)]),
  keys: [['ArrowUp', 50], ['ArrowLeft', 50], ['PageDown', 50], ['Home', 50], ['End', 50], ['Tab', 50]].map(([k, v]) => [k, v, keyValue(k as string, v as number, nb), keyValue(k as string, v as number, nb, { rtl: true })]),
  fill: [[25, nb], [5, open]].map(([v, b]) => [v, b, fillFraction(v as number, b as never)]),
}
writeFileSync(new URL('../test/fixtures/numbers.json', import.meta.url), JSON.stringify(numbers) + '\n')
console.log('wrote numbers.json')
