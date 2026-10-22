import { unionDistance, type GlassShape } from './geometry'

/**
 * Refraction for the canvas renderer: glass that bends the content behind it near its edges, as a
 * displacement map (red = x, green = y, 128 = no shift) for SVG `feDisplacementMap`. Only the
 * bevel bends; the flat middle shows the backdrop straight. The profile is our own fit to
 * measurements of rendered Liquid Glass (ui/research/liquid-glass/FINDINGS.md): at depth `t` from
 * the edge a pixel shows the backdrop from `shift · (1 - t / bezel)^4` deeper inside, so the rim
 * shows a compressed, mirrored band of what lies further in. Pure, so the Flutter twin (a fragment
 * shader there) follows the same profile.
 */

/** Bezel width (px) of large glass: where the bend fades to nothing. */
export const GLASS_BEZEL = 27
/** Largest shift (px), at the very edge of large glass. */
export const GLASS_REFRACTION = 47
/** Exponent of the bend's fall-off across the bezel. */
export const GLASS_BEZEL_POWER = 4
/** Glass whose shorter side reaches this (px) bends fully; smaller glass scales bezel and shift. */
export const GLASS_LARGE_SIDE = 88
/** How fast smaller glass shrinks its bezel: scale = (side / GLASS_LARGE_SIDE) ^ this. */
export const GLASS_SIZE_EXPONENT = 0.78

/** Bezel and shift scale for glass whose shorter side is `side` px (1 for large glass). */
export function refractionScale(side: number) {
  if (!(side > 0)) return 0
  return Math.min(1, side / GLASS_LARGE_SIDE) ** GLASS_SIZE_EXPONENT
}

/**
 * Bend at one point from its signed distance `d` (negative inside) and the outward normal
 * (`nx`, `ny`, unit length): a shift toward the inside that is strongest at the edge and fades to
 * zero across the bezel. Returns -1…1 per axis, as a share of the largest shift.
 */
export function refractionAt(d: number, nx: number, ny: number, bezel = GLASS_BEZEL) {
  if (d >= 0 || bezel <= 0) return { x: 0, y: 0 }
  const t = Math.min(1, -d / bezel)
  if (t >= 1) return { x: 0, y: 0 }
  const bend = (1 - t) ** GLASS_BEZEL_POWER
  return { x: -nx * bend, y: -ny * bend }
}

/**
 * RGBA displacement map for `width` × `height` px (material coordinates) holding the blended
 * outlines of `clusters`. Red/green carry the shift (neutral in the flat middle) as a share of
 * `scale / 2` px, the value to pass to `feDisplacementMap`; alpha is the glass shape itself
 * (anti-aliased), so the filter can clip its own output: Chromium ignores an element's clip-path
 * for `backdrop-filter: url()`. Each cluster bends by its own size (its smallest shape).
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
  }
  const sizes = clusters.map((shapes) => (shapes.length ? refractionScale(Math.min(...shapes.map((s) => Math.min(s.width, s.height)))) : 0))
  const largest = Math.max(0, ...sizes)
  clusters.forEach((shapes, index) => {
    if (!shapes.length) return
    const size = sizes[index]
    // This cluster's shift as a share of the map's (the largest cluster's) shift.
    const share = largest > 0 ? size / largest : 0
    const x0 = Math.max(0, Math.floor(Math.min(...shapes.map((s) => s.x))) - 1)
    const y0 = Math.max(0, Math.floor(Math.min(...shapes.map((s) => s.y))) - 1)
    const x1 = Math.min(w, Math.ceil(Math.max(...shapes.map((s) => s.x + s.width))) + 1)
    const y1 = Math.min(h, Math.ceil(Math.max(...shapes.map((s) => s.y + s.height))) + 1)
    const band = Math.min(bezel * size, ...shapes.map((s) => Math.min(s.width, s.height) / 2))
    const distance = (x: number, y: number) => unionDistance(x, y, shapes, spacing)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const px = x + 0.5
        const py = y + 0.5
        const d = distance(px, py)
        const i = (y * w + x) * 4
        // Clusters' boxes can overlap: only ever add coverage.
        data[i + 3] = Math.max(data[i + 3], Math.round(Math.min(1, Math.max(0, 0.5 - d)) * 255))
        if (d >= 0.5 || d <= -band) continue
        const gx = distance(px + 1, py) - distance(px - 1, py)
        const gy = distance(px, py + 1) - distance(px, py - 1)
        const length = Math.hypot(gx, gy) || 1
        const bend = refractionAt(Math.min(d, -1e-3), gx / length, gy / length, band)
        data[i] = Math.round(128 + bend.x * share * 127)
        data[i + 1] = Math.round(128 + bend.y * share * 127)
      }
  })
  return { width: w, height: h, data, scale: 2 * GLASS_REFRACTION * largest }
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
