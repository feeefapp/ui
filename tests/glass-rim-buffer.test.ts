import assert from 'node:assert/strict'
import { test } from 'node:test'
import { obsoleteRimRegions, rimBufferCapacity } from '../src/glass/rim-buffer.ts'

test('rim backing buckets bound retained memory and avoid shrink/grow boundary oscillation', () => {
  let capacity = 0
  for (const active of [65, 63, 64, 65, 127, 129, 128, 127, 192, 65, 64, 32, 512, 63]) {
    capacity = rimBufferCapacity(active, capacity)
    const rounded = Math.max(64, Math.ceil(active / 64) * 64)
    assert.ok(capacity >= active)
    assert.ok(capacity <= rounded * 2)
    assert.equal(capacity % 64, 0)
  }
  assert.equal(rimBufferCapacity(64, 128), 128, 'retain at twice the active bucket')
  assert.equal(rimBufferCapacity(64, 192), 64, 'release only above twice the active bucket')
})

test('retained rim pixels match an exact-sized cleared backing after arbitrary growth and shrinkage', () => {
  let capacity = { width: 0, height: 0 }
  let previous = { width: 0, height: 0 }
  let pixels = new Uint8Array(0)
  const frames = [[70, 35], [82, 48], [49, 41], [120, 32], [31, 18], [36, 20], [130, 70], [24, 16], [28, 20]]
  frames.forEach(([width, height], frame) => {
    const active = { width, height }
    const next = { width: rimBufferCapacity(width, capacity.width), height: rimBufferCapacity(height, capacity.height) }
    if (next.width !== capacity.width || next.height !== capacity.height) pixels = new Uint8Array(next.width * next.height)
    else for (const rect of obsoleteRimRegions(previous, active)) {
      for (let y = rect.y; y < rect.y + rect.height; y++) pixels.fill(0, y * next.width + rect.x, y * next.width + rect.x + rect.width)
    }
    // An exact-sized image replaces the whole active area, including newly transparent pixels.
    const paint = (x: number, y: number) => (x + y + frame) % 3 === 0 ? 0 : frame + 1
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels[y * next.width + x] = paint(x, y)
    for (let y = 0; y < next.height; y++) for (let x = 0; x < next.width; x++) {
      assert.equal(pixels[y * next.width + x], x < width && y < height ? paint(x, y) : 0, `stale/incorrect pixel ${x},${y} on frame ${frame}`)
    }
    capacity = next
    previous = active
  })
})

test('fractional spring growth and shrinkage need substantially fewer backing dimension writes', context => {
  let exact = { width: 0, height: 0 }
  let capacity = { width: 0, height: 0 }
  let exactWrites = 0
  let capacityWrites = 0
  for (let frame = 0; frame < 160; frame++) {
    const progress = (frame % 80) / 79
    const settle = 1 - Math.exp(-7 * progress) * Math.cos(12 * progress)
    const width = Math.ceil(2 * (frame < 80 ? 72 + 184 * settle : 256 - 184 * settle))
    const height = Math.ceil(2 * (48 + 6 * Math.exp(-7 * progress) * Math.sin(12 * progress)))
    const next = { width: rimBufferCapacity(width, capacity.width), height: rimBufferCapacity(height, capacity.height) }
    exactWrites += Number(exact.width !== width) + Number(exact.height !== height)
    capacityWrites += Number(capacity.width !== next.width) + Number(capacity.height !== next.height)
    exact = { width, height }
    capacity = next
  }
  assert.ok(capacityWrites < exactWrites / 8, `${capacityWrites} retained vs ${exactWrites} exact writes`)
  context.diagnostic(`160 grow/shrink frames: backing dimension writes ${exactWrites} → ${capacityWrites}`)
})
