/**
 * Writes flutter/test/fixtures/sheet.json from the web kit's sheet model, so the Dart twin is
 * tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_sheet_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import {
  detentHeight,
  detentHeights,
  dragHeight,
  flingStep,
  focusRaise,
  freeTarget,
  nearestDetent,
  releaseTarget,
  sheetDim,
  sheetFrame,
  sheetMorphFrame,
  sheetRecede,
  sheetScrollStep,
  type SheetDetent,
  type SheetMetrics,
} from '../../src/containers/sheet-model'

const metrics: SheetMetrics[] = [
  { hostHeight: 812, topInset: 57, natural: 340, peek: 96 },
  { hostHeight: 640, topInset: 10, natural: 900 },
  { hostHeight: 401, topInset: 10.5, natural: 120.5 },
  { hostHeight: 0, topInset: 10, natural: 50 },
]
const detents: SheetDetent[] = ['peek', 'medium', 'large', 'fit', 0, 260, 2000, -40, '35%', '50%', '12.5%', '100%']
const sets: SheetDetent[][] = [['peek', 'medium', 'large'], ['large'], ['medium', 'large'], ['fit'], ['35%', 'medium', 'large'], [200, 'large']]
const raws = [-120, 0, 40, 180, 300, 406, 500, 755, 800, 1200]
const velocities = [-3000, -800, -100, 0, 100, 800, 3000]

const fixture = {
  detentHeight: metrics.flatMap((m) => detents.map((detent) => ({ detent, metrics: m, height: detentHeight(detent, m) }))),
  sets: metrics.slice(0, 3).flatMap((m) =>
    sets.map((set) => {
      const heights = detentHeights(set, m)
      return {
        detents: set,
        metrics: m,
        heights,
        drag: [true, false].flatMap((dismissible) =>
          raws.map((raw) => ({ raw, dismissible, height: dragHeight(raw, heights, m.hostHeight, dismissible) }))
        ),
        release: [true, false].flatMap((dismissible) =>
          raws.flatMap((visible) =>
            velocities.map((velocity) => ({
              visible,
              velocity,
              dismissible,
              ...releaseTarget(visible, velocity, heights, dismissible),
            }))
          )
        ),
        dim: raws.map((visible) => ({ visible, dim: sheetDim(visible, heights) })),
        // Background interaction up through each detent.
        undimmed: heights.flatMap((undimmed) =>
          raws.map((visible) => ({ visible, undimmed, dim: sheetDim(visible, heights, undimmed, detentHeight('large', m)) }))
        ),
        frame: (['float', 'attached', 'card'] as const).flatMap((mode) =>
          raws.map((visible) => ({
            visible,
            mode,
            ...sheetFrame(visible, { heights, large: detentHeight('large', m), inset: 8, radius: 32, mode }),
          }))
        ),
        focus: [undefined, null, ...set].flatMap((focusDetent) =>
          set.map((_, index) => ({ index, focusDetent: focusDetent === undefined ? 'default' : focusDetent, raise: focusRaise(set, heights, index, focusDetent) }))
        ),
      }
    })
  ),
  free: [[84, 400, 790], [120, 760]].flatMap((heights) =>
    [true, false].flatMap((dismissible) =>
      raws.flatMap((visible) => velocities.map((velocity) => ({ heights, dismissible, visible, velocity, ...freeTarget(visible, velocity, heights, dismissible), nearest: nearestDetent(visible, heights) })))
    )
  ),
  scroll: [400, 700, 750].flatMap((raw) =>
    [0, 200, 1000].flatMap((scroll) =>
      [0, 1000].flatMap((scrollMax) =>
        [-900, -250, -30, 0, 30, 250, 900].map((delta) => ({ raw, scroll: Math.min(scroll, scrollMax), delta, max: 700, scrollMax, out: sheetScrollStep({ raw, scroll: Math.min(scroll, scrollMax) }, delta, 700, scrollMax) }))
      )
    )
  ),
  fling: [-3000, -500, 0, 800, 2500].flatMap((velocity) => [1, 16, 100, 1000].map((ms) => { const f = flingStep(120, velocity, ms); return { velocity, ms, scroll: f.scroll, velocity_: f.velocity } })),
  // Morph frames as numbers (the web kit formats them into CSS strings).
  morph: [0, 0.08, 0.3, 0.5, 0.8, 1, 1.12, -0.1].flatMap((p) =>
    [
      { panel: { x: 0, y: 400, width: 390, height: 400 }, source: { x: 300, y: 50, width: 80, height: 40 }, sourceRadius: 20 },
      { panel: { x: 8, y: 300, width: 396, height: 512 }, source: { x: 140, y: 740, width: 132, height: 44 }, sourceRadius: 999 },
    ].map(({ panel, source, sourceRadius }) => {
      const f = sheetMorphFrame(p, panel, source, sourceRadius, 32)
      const [dx, dy] = f.transform.match(/-?[\d.]+(?=px)/g)!.map(Number)
      const [, side, bottom, , radius] = f.clip.match(/-?[\d.]+(?=px)/g)!.map(Number)
      return { p, panel, source, sourceRadius, dx, dy, side, bottom, radius, content: f.content }
    })
  ),
  recede: [0, 300, 543.6, 600, 700, 755, 800].flatMap((visible) =>
    [0, 755, 630].map((large) => ({ visible, large, recede: sheetRecede(visible, large) }))
  ),
}
writeFileSync(new URL('../test/fixtures/sheet.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n')
console.log('wrote flutter/test/fixtures/sheet.json')
