import assert from 'node:assert/strict'
import { test } from 'node:test'
import { glassLayoutRect } from '../src/glass/press.ts'

test('remeasuring pressed content recovers the same layout throughout a moving spring', () => {
  const layout = { x: 20, y: 12, width: 180, height: 44 }
  for (const contentScale of [1, 1.0125, 1.06, 1.067, 1.0005]) {
    const offset = { x: 8.25, y: -3.125 }
    const width = layout.width * contentScale
    const height = layout.height * contentScale
    const measured = {
      x: layout.x + offset.x + (layout.width - width) / 2,
      y: layout.y + offset.y + (layout.height - height) / 2,
      width,
      height,
    }
    const recovered = glassLayoutRect(measured, offset, contentScale)
    for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(recovered[key] - layout[key]) < 1e-10)
  }
})
