/** Seeded pixel noise shared by PixelTexture and artwork, pure (the Flutter twin ports it). */

export type Pixel = { x: number; y: number; opacity: number; color?: string }

/** FNV-1a hash of a seed string. */
export function seedNumber(value: string) {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619)
  }
  return result >>> 0
}

/** Deterministic random numbers in [0, 1) for a seed (mulberry32). */
export function randomSequence(value: string) {
  let state = seedNumber(value)
  return () => {
    state += 0x6d2b79f5
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Squares of a PixelTexture (viewBox 256 × 96, 2px squares on a 4px grid) for a seed. `corner`
 * gathers toward the top end, `wave` along a band, `grain` everywhere.
 */
export function texturePixels(
  variant: 'corner' | 'grain' | 'wave',
  seed: string,
  density: string
) {
  const random = randomSequence(seed)
  const threshold = density === 'dense' ? 0.6 : density === 'medium' ? 0.39 : 0.23
  const pixels: Pixel[] = []

  for (let row = 0; row < 24; row++) {
    for (let column = 0; column < 64; column++) {
      const x = column / 63
      const y = row / 23
      let field = 1
      if (variant === 'corner') field = Math.pow(x, 1.7) * (0.35 + Math.pow(1 - y, 1.4) * 0.65)
      if (variant === 'wave')
        field = Math.max(0, 1 - Math.abs(y - 0.5 - Math.sin(x * 8) * 0.24) * 3)
      if (random() < field * threshold) {
        pixels.push({ x: column * 4, y: row * 4, opacity: 0.25 + random() * 0.75 })
      }
    }
  }
  return pixels
}
