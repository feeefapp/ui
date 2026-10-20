/** Visual identity, not a security hash. Stable serialization makes object key order irrelevant. */
export function avatarKey(data: unknown): string {
  const seen = new Set<object>()
  const serialize = (value: any): string => {
    if (typeof value === 'string') return JSON.stringify(value.normalize('NFC'))
    if (value === null || typeof value !== 'object') return String(value)
    if (seen.has(value)) throw new Error('Avatar data must not contain cycles.')
    seen.add(value)
    const result =
      value instanceof Date
        ? value.toISOString()
        : Array.isArray(value)
          ? `[${value.map(serialize).join(',')}]`
          : `{${Object.keys(value)
              .sort()
              .map((key) => `${JSON.stringify(key)}:${serialize(value[key])}`)
              .join(',')}}`
    seen.delete(value)
    return result
  }
  return serialize(data)
}

function hash(value: string, salt: number) {
  let state = (2166136261 ^ salt) >>> 0
  for (const character of value)
    state = Math.imul(state ^ character.codePointAt(0)!, 16777619) >>> 0
  state ^= state >>> 16
  return Math.imul(state, 2246822507) >>> 0
}

/** The same data and rotation salt always return the same palette, orientation and pixel shading. */
export function voiceFingerprint(data: unknown, rotationSalt = 0) {
  const source = `${avatarKey(data)}:${rotationSalt}`
  const hashes = [0, 1, 2, 3].map((salt) => hash(source, salt * 2654435761))
  const key = hashes.map((value) => value.toString(16).padStart(8, '0')).join('')
  const rotation = (hashes[1] / 4294967296) * Math.PI * 2
  const hue = hashes[0] % 360
  const colors = [
    `hsl(${hue} 38% 91%)`,
    `hsl(${hue} 54% 72%)`,
    `hsl(${hue} 58% 54%)`,
    `hsl(${(hue + 28) % 360} 52% 36%)`,
    `hsl(${(hue + 42) % 360} 46% 24%)`,
  ]
  const pixels: { x: number; y: number; color: string; opacity: number }[] = []
  const threshold = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  const frequency = 2 + (hashes[2] % 3)
  for (let row = 0; row < 16; row++)
    for (let column = 0; column < 16; column++) {
      const x = (column - 7.5) / 7.5,
        y = (row - 7.5) / 7.5
      const radius = Math.hypot(x, y)
      const angle = Math.atan2(y, x) + rotation
      const edge = 0.91 + 0.05 * Math.sin(angle * 3 + hashes[3] / 1000)
      if (radius > edge) continue
      const z = Math.sqrt(Math.max(0, 1 - radius * radius))
      const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation)
      const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation)
      const light = Math.max(0, Math.min(1, z * 0.72 - x * 0.36 - y * 0.42))
      const ribbon = Math.sin(rotatedX * frequency * 2.2 + rotatedY * 2.1 + z * 2.4)
      const shade = Math.max(0, Math.min(1, light * 0.68 + (ribbon + 1) * 0.16))
      const dither = threshold[(row % 4) * 4 + (column % 4)] / 16
      const index = Math.max(1, Math.min(4, Math.floor((1 - shade) * 4 + dither * 0.65)))
      pixels.push({ x: column * 4, y: row * 4, color: colors[index], opacity: 1 })
    }
  return { key, rotation, colors, pixels, width: 64, height: 64 }
}
