import { rectGap, type GlassRect } from './geometry'

/**
 * How bubbles change when the layout changes, following Apple's glass rules: inside one container
 * the glass is one material, so a bubble is never born or lost on its own while another is there.
 * - a new bubble within `spacing` of a bubble that just left grows out of it (one bubble splitting
 *   into several, or a replacement);
 * - otherwise a new bubble is born out of its nearest neighbour, preferring one in the same row: a
 *   droplet at the neighbour's facing edge (`glassSeed`) that stretches out to its place;
 * - a leaving bubble is absorbed into the new bubble it overlaps (several merging into one), else
 *   into its nearest neighbour, preferring the same row, shrinking into that neighbour's facing edge;
 * - only a bubble with no other bubble in the container materializes in place or dematerializes.
 */
export type GlassBirth =
  /** Start at `from` (the source bubble's rect, or a droplet at its facing edge) and spring to the target. */
  | { id: string; kind: 'grow'; source: string; from: GlassRect }
  /** Start as a point at the target's centre and spring open. */
  | { id: string; kind: 'materialize' }

export type GlassDeath =
  /** Keep drawing the leaving bubble while it springs into `into` (the bubble it merges into, or a
   * droplet at that bubble's facing edge), then drop it. */
  | { id: string; kind: 'absorb'; target: string; into: GlassRect }
  /** Shrink to a point and drop it. */
  | { id: string; kind: 'dematerialize' }

export type GlassPlan = { births: GlassBirth[]; deaths: GlassDeath[] }

const overlap = (a: GlassRect, b: GlassRect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))

/** True when `a` and `b` share some height: bubbles of one row. */
export function sameGlassRow(a: GlassRect, b: GlassRect) {
  return Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0
}

/** Closest candidate within `spacing`, preferring the largest overlap, then the smallest gap. */
function nearest(rect: GlassRect, candidates: ReadonlyMap<string, GlassRect>, spacing: number) {
  let best: { id: string; rect: GlassRect; overlap: number; gap: number } | null = null
  for (const [id, other] of candidates) {
    const gap = rectGap(rect, other)
    if (gap > spacing) continue
    const shared = overlap(rect, other)
    if (!best || shared > best.overlap || (shared === best.overlap && gap < best.gap))
      best = { id, rect: other, overlap: shared, gap }
  }
  return best
}

/** Closest candidate at any distance: one in the same row first, then the smallest gap. */
function neighbour(rect: GlassRect, candidates: ReadonlyMap<string, GlassRect>) {
  let best: { id: string; rect: GlassRect; row: boolean; gap: number } | null = null
  for (const [id, other] of candidates) {
    const row = sameGlassRow(rect, other)
    const gap = rectGap(rect, other)
    if (!best || (row && !best.row) || (row === best.row && gap < best.gap)) best = { id, rect: other, row, gap }
  }
  return best
}

/**
 * The droplet a bubble is born from, or absorbed into, at `anchor`'s end facing `toward`: a round
 * drop as tall (stacked: as wide) as the smaller of the two, tucked inside that end so it is hidden
 * in the anchor's glass. A new bubble stretches out of its neighbour from there instead of sliding
 * out from under it, and a leaving one shrinks back into it without a trace.
 */
export function glassSeed(anchor: GlassRect, toward: GlassRect): GlassRect {
  const ax = anchor.x + anchor.width / 2
  const ay = anchor.y + anchor.height / 2
  const tx = toward.x + toward.width / 2
  const ty = toward.y + toward.height / 2
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))
  const horizontal =
    sameGlassRow(anchor, toward) || Math.abs(tx - ax) * anchor.height >= Math.abs(ty - ay) * anchor.width
  if (horizontal) {
    const height = Math.min(anchor.height, toward.height)
    const width = Math.min(height, toward.width, anchor.width)
    const x = tx >= ax ? anchor.x + anchor.width - width : anchor.x
    const cy = clamp(ty, anchor.y + height / 2, anchor.y + anchor.height - height / 2)
    return { x, y: cy - height / 2, width, height }
  }
  const width = Math.min(anchor.width, toward.width)
  const height = Math.min(width, toward.height, anchor.height)
  const y = ty >= ay ? anchor.y + anchor.height - height : anchor.y
  const cx = clamp(tx, anchor.x + width / 2, anchor.x + anchor.width - width / 2)
  return { x: cx - width / 2, y, width, height }
}

/**
 * Plans births and deaths between two measurements.
 * @param previous current visual rects of bubbles drawn before the change (including ones leaving)
 * @param next target rects of the bubbles present after the change
 */
export function planGlassTransition(
  previous: ReadonlyMap<string, GlassRect>,
  next: ReadonlyMap<string, GlassRect>,
  spacing: number
): GlassPlan {
  const leaving = new Map([...previous].filter(([id]) => !next.has(id)))
  const staying = new Map([...previous].filter(([id]) => next.has(id)))
  const births: GlassBirth[] = []
  for (const [id, rect] of next) {
    if (previous.has(id)) continue
    // A bubble that just left right here (a split or a replacement), else the nearest neighbour
    // that stays, else the nearest one leaving.
    const source = nearest(rect, leaving, spacing) ?? neighbour(rect, staying) ?? neighbour(rect, leaving)
    if (!source) births.push({ id, kind: 'materialize' })
    else
      births.push({
        id,
        kind: 'grow',
        source: source.id,
        from: overlap(source.rect, rect) > 0 ? source.rect : glassSeed(source.rect, rect),
      })
  }
  const deaths: GlassDeath[] = []
  for (const [id, rect] of leaving) {
    // In a split the parent is absorbed into the child it overlaps most while the children grow
    // out of it, so the glass never has a gap; otherwise into its nearest neighbour.
    const target = nearest(rect, next, spacing) ?? neighbour(rect, next)
    if (!target) deaths.push({ id, kind: 'dematerialize' })
    else
      deaths.push({
        id,
        kind: 'absorb',
        target: target.id,
        into: overlap(target.rect, rect) > 0 ? target.rect : glassSeed(target.rect, rect),
      })
  }
  return { births, deaths }
}

/** True when `a` and `b` describe the same rect within half a pixel. */
export function sameRect(a: GlassRect, b: GlassRect) {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

/**
 * Mark an element with this attribute while it moves as one piece (a presentation surface entering
 * or leaving): the glass inside it takes every layout change at once, with no births, deaths or
 * springs, so it rides the element's transform and leaves with it in the same frames.
 */
export const GLASS_INSTANT_ATTRIBUTE = 'data-glass-instant'

/**
 * Put this attribute on content that animates its own size inside a bubble (a segmented control
 * folding into its menu): while it is there, the glass of every bubble in that container follows
 * the layout exactly instead of springing after it (like `glassMotion="follow"`), so the content
 * never pokes out of its glass and the neighbours it pushes never overlap it.
 */
export const GLASS_FOLLOW_ATTRIBUTE = 'data-glass-follow'

/** For this long (ms) after glass first appears, its bubbles appear in place (lazy content). */
export const GLASS_SETTLE_MS = 300

/**
 * Whether a layout change applies at once instead of springing: with reduced motion, inside an
 * element marked `GLASS_INSTANT_ATTRIBUTE`, before the container has ever been rendered
 * (`shownAt` null: glass measured inside a closed dialog or a hidden panel must not grow in once
 * shown), and for `GLASS_SETTLE_MS` after it first was.
 */
export function glassChangesAtOnce(options: { reduceMotion: boolean; instant: boolean; shownAt: number | null; now: number }) {
  const { reduceMotion, instant, shownAt, now } = options
  return reduceMotion || instant || shownAt === null || now - shownAt < GLASS_SETTLE_MS
}
