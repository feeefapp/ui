import { unionDistance, type GlassShape } from './geometry'

/**
 * Refraction for the canvas renderer: glass that bends the content behind it near its edges, as a
 * displacement map (red = x, green = y, 128 = no shift) for SVG `feDisplacementMap`. Only the
 * bevel bends; the flat middle shows the backdrop straight, like Apple's glass. Pure, so the
 * Flutter twin (a fragment shader there) follows the same profile.
 */

/** Width (px) of the bending rim, capped by half the glass height. */
export const GLASS_BEZEL = 14
/** Largest shift (px) at the very edge; the filter's `scale` is twice this. */
export const GLASS_REFRACTION = 9

/**
 * Bend at one point from its signed distance `d` (negative inside) and the outward normal
 * (`nx`, `ny`, unit length): a shift toward the inside that is strongest at the edge and fades to
 * zero across the bezel, following a convex squircle profile's slope. Returns -1…1 per axis.
 */
export function refractionAt(d: number, nx: number, ny: number, bezel = GLASS_BEZEL) {
  if (d >= 0 || bezel <= 0) return { x: 0, y: 0 }
  const t = Math.min(1, -d / bezel)
  if (t >= 1) return { x: 0, y: 0 }
  // Slope of h(t) = (1 - (1 - t)^4)^(1/4), normalized: 1 at the edge, 0 on the flat top.
  const u = 1 - t
  const slope = Math.min(1, (u ** 3 * (1 - u ** 4) ** -0.75) / 3)
  return { x: -nx * slope, y: -ny * slope }
}

/**
 * RGBA displacement map for `width` × `height` px (material coordinates) holding the blended
 * outlines of `clusters`. Pixels outside the glass and in its flat middle stay neutral.
 */
export function displacementMap(
  width: number,
  height: number,
  clusters: readonly (readonly GlassShape[])[],
  spacing: number,
  bezel = GLASS_BEZEL
) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128
    data[i + 1] = 128
    data[i + 3] = 255
  }
  for (const shapes of clusters) {
    if (!shapes.length) continue
    const x0 = Math.max(0, Math.floor(Math.min(...shapes.map((s) => s.x))) - 1)
    const y0 = Math.max(0, Math.floor(Math.min(...shapes.map((s) => s.y))) - 1)
    const x1 = Math.min(w, Math.ceil(Math.max(...shapes.map((s) => s.x + s.width))) + 1)
    const y1 = Math.min(h, Math.ceil(Math.max(...shapes.map((s) => s.y + s.height))) + 1)
    const band = Math.min(bezel, ...shapes.map((s) => Math.min(s.width, s.height) / 2))
    const distance = (x: number, y: number) => unionDistance(x, y, shapes, spacing)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const px = x + 0.5
        const py = y + 0.5
        const d = distance(px, py)
        if (d >= 0 || d <= -band) continue
        const gx = distance(px + 1, py) - distance(px - 1, py)
        const gy = distance(px, py + 1) - distance(px, py - 1)
        const length = Math.hypot(gx, gy) || 1
        const bend = refractionAt(d, gx / length, gy / length, band)
        const i = (y * w + x) * 4
        data[i] = Math.round(128 + bend.x * 127)
        data[i + 1] = Math.round(128 + bend.y * 127)
      }
  }
  return { width: w, height: h, data }
}

/**
 * True where SVG filters work as a backdrop filter (Chromium). Elsewhere `backdrop-filter: url()`
 * is ignored or breaks the blur, so the canvas renderer keeps CSS glass.
 */
export function supportsRefraction() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands
  return !!brands?.some((entry) => /Chromium/i.test(entry.brand))
}
