/**
 * The LGLab app's backgrounds (app/LGLab.swift backgroundImage), pixel for pixel, so the kit can
 * be rendered over exactly what the iOS references were captured over. Device pixels, sRGB.
 */
export function backgroundPixels(kind: string, width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * width + x) * 4
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }
  if (kind === 'photo') {
    const blobs: [number, number, number, [number, number, number]][] = [
      [0.2, 0.15, 0.25, [0.95, 0.45, 0.2]], [0.8, 0.25, 0.3, [0.15, 0.55, 0.95]],
      [0.35, 0.55, 0.3, [0.2, 0.8, 0.45]], [0.75, 0.7, 0.28, [0.9, 0.2, 0.55]],
      [0.25, 0.88, 0.25, [0.98, 0.85, 0.25]], [0.6, 0.45, 0.18, [0.1, 0.1, 0.25]],
    ]
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const u = x / width
        const v = y / height
        let r = 0.55 + 0.25 * v
        let g = 0.65 + 0.15 * v
        let b = 0.85 - 0.2 * v
        for (const [cx, cy, s, c] of blobs) {
          const d2 = ((u - cx) * (u - cx) * 0.25 + (v - cy) * (v - cy) * 0.25 * 4.6) / (s * s * 0.25)
          const w = Math.exp(-d2 * 2.2)
          r = r * (1 - w) + c[0] * w
          g = g * (1 - w) + c[1] * w
          b = b * (1 - w) + c[2] * w
        }
        put(x, y, Math.trunc(Math.min(255, r * 255)), Math.trunc(Math.min(255, g * 255)), Math.trunc(Math.min(255, b * 255)))
      }
  } else if (kind.startsWith('stripes')) {
    const cell = Number(kind.slice(7)) || 6
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const on = (Math.floor(x / cell) % 2 === 0) !== (Math.floor(y / (cell * 8)) % 2 === 0)
        const v = on ? 30 : 225
        put(x, y, v, v, v)
      }
  } else {
    const hex = kind.startsWith('flat-') ? kind.slice(5) : '808080'
    const value = Number.parseInt(hex, 16)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) put(x, y, (value >> 16) & 255, (value >> 8) & 255, value & 255)
  }
  return data
}
