import assert from 'node:assert/strict'
import { test } from 'node:test'
import { boundsOf, unionDistance, type GlassShape } from '../src/glass/geometry.ts'
import { highlightSurface } from '../src/glass/light.ts'

test('culled highlight tiles preserve every dense bevel sample through corners and merging necks', () => {
  const cases: GlassShape[][] = [
    [{ x: 0, y: 0, width: 360, height: 180, radius: 30, cornerExponent: 2 }],
    [{ x: 0.13, y: 0.21, width: 72.3, height: 72.1, radius: 36, cornerExponent: 2 }],
    [{ x: 0, y: 0, width: 120, height: 56, radius: 28 }],
    [{ x: 0, y: 0, width: 104, height: 64, radius: 0 }],
    [{ x: 0, y: 0, width: 64, height: 64, radius: 32, cornerExponent: 1.5 }],
    [{ x: 0, y: 0, width: 60, height: 56, radius: 28, cornerExponent: 2 },
      { x: 61.2, y: 4.7, width: 88, height: 56, radius: 28, cornerExponent: 2 }],
    [{ x: -10, y: 0, width: 72, height: 72, radius: 36 },
      { x: 54, y: 8, width: 80, height: 56, radius: 28 },
      { x: 105, y: 36, width: 72, height: 72, radius: 36 }],
  ]
  for (const shapes of cases) for (const width of [1, 7, 40]) {
    const bounds = boundsOf(shapes)
    const field = highlightSurface(shapes, 16, bounds, width)
    const samples = new Map(field.samples.map(sample => [sample.index, sample]))
    let count = 0
    // A dense oracle checks coverage, depth and normals, including the narrow merge neck.
    // Tile culling is allowed to avoid work; it must not change a single painted pixel.
    for (let y = 0; y < field.height; y++) for (let x = 0; x < field.width; x++) {
      const px = bounds.x + (x + 0.5) / 2
      const py = bounds.y + (y + 0.5) / 2
      const distance = unionDistance(px, py, shapes, 16)
      if (distance >= 0.25 || distance <= -field.bezel) continue
      const sample = samples.get((y * field.width + x) * 4)
      assert.ok(sample, `missing pixel ${x},${y}, width ${width}`)
      assert.equal(sample.depth, Math.max(0, -distance))
      assert.equal(sample.nx, unionDistance(px + 0.5, py, shapes, 16) - unionDistance(px - 0.5, py, shapes, 16))
      assert.equal(sample.ny, unionDistance(px, py + 0.5, shapes, 16) - unionDistance(px, py - 0.5, shapes, 16))
      count++
    }
    assert.equal(samples.size, count)
  }
})
