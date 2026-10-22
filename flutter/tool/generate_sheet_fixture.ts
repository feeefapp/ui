/**
 * Writes flutter/test/fixtures/sheet.json from the web kit's sheet model, so the Dart twin is
 * tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_sheet_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import {
  detentHeight,
  detentHeights,
  dragHeight,
  releaseTarget,
  sheetDim,
  sheetRecede,
  type SheetDetent,
  type SheetMetrics,
} from '../../src/containers/sheet-model'

const metrics: SheetMetrics[] = [
  { hostHeight: 812, topInset: 57, natural: 340 },
  { hostHeight: 640, topInset: 10, natural: 900 },
  { hostHeight: 401, topInset: 10.5, natural: 120.5 },
  { hostHeight: 0, topInset: 10, natural: 50 },
]
const detents: SheetDetent[] = ['medium', 'large', 'fit', 0, 260, 2000, -40, '35%', '50%', '12.5%', '100%']
const sets: SheetDetent[][] = [['large'], ['medium', 'large'], ['fit'], ['35%', 'medium', 'large'], [200, 'large']]
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
      }
    })
  ),
  recede: [0, 300, 543.6, 600, 700, 755, 800].flatMap((visible) =>
    [0, 755, 630].map((large) => ({ visible, large, recede: sheetRecede(visible, large) }))
  ),
}
writeFileSync(new URL('../test/fixtures/sheet.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n')
console.log('wrote flutter/test/fixtures/sheet.json')
