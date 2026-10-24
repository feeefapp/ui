import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clampRadius, mergeWidth, prepareUnionDistance, rectGap, shapeDistance, smoothMin, type GlassShape } from '../src/glass/geometry.ts'
import { GLASS_BEZEL, GLASS_REFRACTION, liveDisplacementMap, refractionAt, refractionScale, webRefractionShift } from '../src/glass/refraction.ts'
import { DEFAULT_GLASS_LIGHT } from '../src/glass/light.ts'
import { edgeMask } from '../src/glass/material.ts'

// Frozen dense arithmetic oracle: no tile rejection or prepared distance state. The circular
// branch deliberately keeps the original generic powers to detect rounding changes in the
// faster square-root branch, including their effect on finite-difference normals and bytes.
function referenceShapeDistance(px: number, py: number, shape: GlassShape) {
  if (shape.cornerExponent !== 2) return shapeDistance(px, py, shape)
  const r = clampRadius(shape)
  const hx = shape.width / 2
  const hy = shape.height / 2
  const qx = Math.abs(px - (shape.x + hx)) - hx + r
  const qy = Math.abs(py - (shape.y + hy)) - hy + r
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const exponent = shape.cornerExponent
  const outside = ox === 0 || oy === 0 ? ox + oy : (ox ** exponent + oy ** exponent) ** (1 / exponent)
  return outside + Math.min(Math.max(qx, qy), 0) - r
}

function referenceUnion(shapes: readonly GlassShape[], spacing: number) {
  const widths = shapes.map((shape, i) => i === 0 ? 0 : mergeWidth(Math.min(...shapes.slice(0, i).map(other => rectGap(shape, other))), spacing))
  return (x: number, y: number) => {
    let d = Infinity
    for (let i = 0; i < shapes.length; i++) {
      const next = referenceShapeDistance(x, y, shapes[i])
      d = d === Infinity ? next : smoothMin(d, next, widths[i])
    }
    return d
  }
}

function denseMap(width: number, height: number, w: number, h: number, clusters: GlassShape[][], spacing: number, profile: 'gentle' | 'measured') {
  const pixelWidth = width / w
  const pixelHeight = height / h
  const coverage = Math.max(pixelWidth, pixelHeight)
  const sides = clusters.map(shapes => shapes.length ? Math.min(...shapes.map(s => Math.min(s.width, s.height))) : 0)
  const shifts = sides.map(side => profile === 'measured' ? GLASS_REFRACTION * refractionScale(side) : webRefractionShift(side))
  const maximum = Math.max(0, ...shifts)
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = 128
  clusters.forEach((shapes, cluster) => {
    if (!shapes.length) return
    const distance = referenceUnion(shapes, spacing)
    const band = Math.min(GLASS_BEZEL * refractionScale(sides[cluster]), sides[cluster] / 2)
    const share = maximum ? shifts[cluster] / maximum : 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = (x + 0.5) * pixelWidth
      const py = (y + 0.5) * pixelHeight
      const d = distance(px, py)
      const i = (y * w + x) * 4
      data[i + 3] = Math.max(data[i + 3], Math.round(Math.min(1, Math.max(0, 0.5 - d / coverage)) * 255))
      if (d >= coverage / 2 || d <= -band) continue
      const gx = distance(px + 1, py) - distance(px - 1, py)
      const gy = distance(px, py + 1) - distance(px, py - 1)
      const length = Math.hypot(gx, gy) || 1
      // Blue: the edge mask, averaged over four depths across the map pixel.
      const cosine = (gx * DEFAULT_GLASS_LIGHT.x + gy * DEFAULT_GLASS_LIGHT.y) / length
      let edge = 0
      for (let k = 0; k < 4; k++) edge += edgeMask(-d + ((k + 0.5) / 4 - 0.5) * coverage, cosine)
      data[i + 2] = Math.max(data[i + 2], Math.round((edge / 4) * 255))
      const bend = refractionAt(Math.min(d, -1e-3), gx / length, gy / length, band)
      data[i] = Math.round(128 + bend.x * share * 127)
      data[i + 1] = Math.round(128 + bend.y * share * 127)
    }
  })
  return data
}

const shape = (x: number, y: number, width: number, height: number, radius = Math.min(width, height) / 2, cornerExponent: number | undefined = 2): GlassShape =>
  ({ x, y, width, height, radius, cornerExponent })

const fixtures = [
  { width: 696, height: 72, spacing: 24, clusters: [[shape(0, 0, 224, 72), shape(236, 0, 224, 72), shape(472, 0, 224, 72)]] },
  { width: 600, height: 400, spacing: 12, clusters: [[shape(0, 0, 600, 400, 36)]] },
  { width: 140.25, height: 84.75, spacing: 40, clusters: [[shape(16, 24, 100, 40), shape(16.25, 23.5, 98.25, 42), shape(10, 30, 120, 28)]] },
  { width: 200, height: 120, spacing: 16, clusters: [[shape(-12, 2.25, 80.5, 65.5, 19, undefined), shape(73, 20, 85, 40, 11, 3)]] },
  { width: 160, height: 90, spacing: 0, clusters: [[shape(3, 0, 60, 48, 18, 1)], [shape(48, 24, 90, 54, 8)], []] },
  { width: 1800, height: 600, spacing: 4, clusters: [[shape(50.5, 100.25, 7.5, 2.5, 1)]] },
  // Cached full-density fields have nonzero origins, one-pixel normal halos and clipped
  // bounds; offscreen members must not allocate a negative-sized field.
  { width: 112, height: 88, spacing: 24, clusters: [[shape(19.25, 11.125, 46.5, 52.75, 18), shape(58.5, 9.75, 42.25, 58.125, 21)]] },
  { width: 90, height: 60, spacing: 12, clusters: [[shape(-19.25, -7.5, 56, 46)], [shape(75.5, 39.25, 50, 40)], [shape(150, 100, 40, 30)], [shape(-70, -60, 20, 20)]] },
]

test('prepared distances preserve dense shape/blend arithmetic at sample and normal coordinates', () => {
  for (const fixture of fixtures) for (const shapes of fixture.clusters) {
    const prepared = prepareUnionDistance(shapes, fixture.spacing)
    const reference = referenceUnion(shapes, fixture.spacing)
    for (let y = -3.5; y < 150; y += 3.125) for (let x = -5.25; x < 720; x += 3.625) {
      assert.equal(prepared(x, y), reference(x, y), `distance ${x},${y}`)
      assert.equal(prepared(x + 1, y) - prepared(x - 1, y), reference(x + 1, y) - reference(x - 1, y), 'horizontal normal')
      assert.equal(prepared(x, y + 1) - prepared(x, y - 1), reference(x, y + 1) - reference(x, y - 1), 'vertical normal')
    }
  }
})

test('culled live maps preserve every RGBA byte of dense sampling, including overlapping clusters', () => {
  for (const fixture of fixtures) for (const profile of ['gentle', 'measured'] as const) {
    const map = liveDisplacementMap(fixture.width, fixture.height, fixture.clusters, fixture.spacing, profile)
    const expected = denseMap(fixture.width, fixture.height, map.width, map.height, fixture.clusters, fixture.spacing, profile)
    assert.deepEqual(map.data, expected, `${fixture.width}×${fixture.height}, ${profile}`)
  }
})
