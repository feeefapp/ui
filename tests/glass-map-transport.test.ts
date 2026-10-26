import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  GLASS_LIVE_MAP_PIXELS,
  displacementMap,
  liveDisplacementMap,
  rgbaBmpDataUrl,
} from '../src/glass/refraction.ts'

test('a live map at full density keeps the reference lens and coverage unchanged', () => {
  const shapes = [[{ x: 4, y: 4, width: 88, height: 88, radius: 44, cornerExponent: 2 }]]
  for (const profile of ['gentle', 'measured'] as const) {
    assert.deepEqual(liveDisplacementMap(96, 96, shapes, 8, profile), displacementMap(96, 96, shapes, 8, undefined, profile))
  }
})

test('live maps bound raster work even for large or extremely thin hosts', () => {
  for (const [width, height] of [[1500, 400], [400, 1500], [32769, 1], [1, 32769], [1e8, 1], [0, 0]]) {
    const map = liveDisplacementMap(width, height, [], 8)
    assert.ok(map.width * map.height <= GLASS_LIVE_MAP_PIXELS)
    assert.equal(map.data.length, map.width * map.height * 4)
    assert.ok(map.width >= 1 && map.height >= 1)
  }
  const landscape = liveDisplacementMap(1500, 400, [], 8)
  assert.ok(Math.abs(landscape.width / 1500 - landscape.height / 400) < 1 / 400)
})

test('map density never changes displacement strength or the physical size of its lens', () => {
  const shapes = [[{ x: 8, y: 8, width: 44, height: 44, radius: 22, cornerExponent: 2 }]]
  for (const profile of ['gentle', 'measured'] as const) {
    const reference = displacementMap(60, 60, shapes, 8, undefined, profile)
    const expanded = liveDisplacementMap(480, 480, shapes, 8, profile)
    assert.equal(expanded.scale, reference.scale)
    const sample = (x: number, y: number) => {
      const column = Math.floor(x * expanded.width / 480)
      const row = Math.floor(y * expanded.height / 480)
      return [...expanded.data.slice((row * expanded.width + column) * 4, (row * expanded.width + column + 1) * 4)]
    }
    assert.deepEqual(sample(30, 30), [128, 128, 0, 255])
    assert.equal(sample(65, 30)[3], 0)
    assert.ok(sample(10, 30)[0] > 128, 'the left edge still samples inward')
    assert.ok([...expanded.data].some((value, index) => index % 4 === 3 && value > 0 && value < 255), 'the coarse map retains partial edge coverage')
  }
})

test('BMP transport preserves top-down RGBA pixels and explicit alpha masks', () => {
  const rgba = new Uint8ClampedArray([
    11, 22, 33, 0, 44, 55, 66, 127,
    77, 88, 99, 255, 111, 122, 133, 1,
  ])
  const original = rgba.slice()
  const url = rgbaBmpDataUrl(2, 2, rgba)
  assert.ok(url.startsWith('data:image/bmp;base64,'))
  const bytes = Buffer.from(url.split(',')[1], 'base64')
  assert.equal(bytes.toString('ascii', 0, 2), 'BM')
  assert.equal(bytes.readUInt32LE(2), bytes.length)
  assert.equal(bytes.readUInt32LE(14), 108)
  assert.equal(bytes.readInt32LE(18), 2)
  assert.equal(bytes.readInt32LE(22), -2)
  assert.equal(bytes.readUInt16LE(26), 1)
  assert.equal(bytes.readUInt16LE(28), 32)
  assert.equal(bytes.readUInt32LE(30), 3)
  assert.equal(bytes.readUInt32LE(34), rgba.length)
  assert.deepEqual([54, 58, 62, 66].map(offset => bytes.readUInt32LE(offset)), [0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000])
  assert.equal(bytes.readUInt32LE(70), 0x73524742)
  const offset = bytes.readUInt32LE(10)
  assert.equal(offset, 122)
  assert.deepEqual([...bytes.subarray(offset)], [33, 22, 11, 0, 66, 55, 44, 127, 99, 88, 77, 255, 133, 122, 111, 1])
  assert.deepEqual(rgba, original)
})

test('BMP transport rejects malformed dimensions and truncated pixel data', () => {
  for (const [width, height, length] of [[0, 1, 0], [1, 0, 0], [1.5, 2, 12], [2, 2, 12]]) {
    assert.throws(() => rgbaBmpDataUrl(width, height, new Uint8Array(length)), RangeError)
  }
})
