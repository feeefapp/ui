import assert from 'node:assert/strict'
import { test } from 'node:test'
import { glassPaths, loopArea, unionBounds, unionDistance, unionLoops, type GlassShape } from '../src/glass/geometry.ts'
import { displacementMap, liveDisplacementMap } from '../src/glass/refraction.ts'

const capsule: GlassShape = { x: 10, y: 20, width: 100, height: 48, radius: 24, cornerExponent: 2 }

test('overlapping material retains a closed contour outside the original member bounds', () => {
  // During a split/merge the arriving and departing shapes can overlap completely. At this
  // spacing their shared outline grows much farther than the old four-pixel marching pad.
  const shapes = [capsule, { ...capsule }, { ...capsule }]
  const loops = unionLoops(shapes, 40, 1)
  assert.equal(loops.length, 1)
  assert.ok(Math.abs(loopArea(loops[0])) > capsule.width * capsule.height)
  assert.ok(Math.min(...loops[0].map(([, y]) => y)) < capsule.y - 8)
  for (let i = 0; i < loops[0].length; i++) {
    const [x, y] = loops[0][i]
    const [nx, ny] = loops[0][(i + 1) % loops[0].length]
    assert.ok(Math.abs(unionDistance(x, y, shapes, 40)) < 0.03, `${x},${y} must lie on the contour`)
    assert.ok(Math.hypot(nx - x, ny - y) <= Math.SQRT2 + 0.02, 'contour must close through adjacent cells, not a clipped chord')
  }
})

test('paint bounds include the blended fringe throughout a collision', () => {
  for (let gap = -99; gap < 12; gap += 1.75) {
    const shapes = [capsule, { ...capsule, x: capsule.x + capsule.width + gap }]
    const paths = glassPaths(shapes, 12, 1)
    assert.equal(paths.length, 1)
    const { bounds, d } = paths[0]
    const points = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)]
    for (const point of points) {
      const x = Number(point[1])
      const y = Number(point[2])
      assert.ok(x >= bounds.x + 0.99 && x <= bounds.x + bounds.width - 0.99)
      assert.ok(y >= bounds.y + 0.99 && y <= bounds.y + bounds.height - 0.99)
    }
  }
})

test('union bounds conservatively contain multi-member growth without an unbounded pad', () => {
  const shapes = Array.from({ length: 30 }, (_, i) => ({ ...capsule, x: capsule.x + i / 2 }))
  const bounds = unionBounds(shapes, 40)
  assert.ok(capsule.x - bounds.x < 40, 'growth converges instead of adding a full pad per member')
  for (let t = 0; t <= 1; t += 0.01) {
    const x = bounds.x + bounds.width * t
    const y = bounds.y + bounds.height * t
    for (const [px, py] of [[x, bounds.y], [x, bounds.y + bounds.height], [bounds.x, y], [bounds.x + bounds.width, y]]) {
      assert.ok(unionDistance(px, py, shapes, 40) >= -1e-8, 'all four sampling borders must stay outside the glass')
    }
  }
})

test('single and unblended bounds retain the native corner-radius box', () => {
  const { x, y, width, height } = capsule
  assert.deepEqual(glassPaths([capsule], 12)[0].bounds, { x, y, width, height })
  assert.deepEqual(unionBounds([capsule, { ...capsule }], 0), { x, y, width, height })
  assert.deepEqual(unionBounds([], 12), { x: 0, y: 0, width: 0, height: 0 })
})

test('refraction maps cover the expanded merge and its antialiased silhouette', () => {
  const shapes = Array.from({ length: 3 }, () => ({ ...capsule, x: 30, y: 36 }))
  for (const [width, height] of [[160, 120], [480, 360]]) {
    const map = width === 160
      ? displacementMap(width, height, [shapes], 40)
      : liveDisplacementMap(width, height, [shapes], 40)
    const pixelWidth = width / map.width
    const pixelHeight = height / map.height
    const coverageWidth = Math.max(pixelWidth, pixelHeight)
    let expandedPixels = 0
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const px = (x + 0.5) * pixelWidth
      const py = (y + 0.5) * pixelHeight
      const d = unionDistance(px, py, shapes, 40)
      const alpha = Math.round(Math.min(1, Math.max(0, 0.5 - d / coverageWidth)) * 255)
      const index = (y * map.width + x) * 4
      assert.equal(map.data[index + 3], alpha, `silhouette coverage at ${px},${py}`)
      if (py < shapes[0].y - 2 && alpha > 0) {
        expandedPixels++
        assert.ok(map.data[index + 1] > 128, 'the top expanded bevel bends the source inward')
      }
    }
    assert.ok(expandedPixels > 0, 'the map must include glass beyond every member box')
  }
})
