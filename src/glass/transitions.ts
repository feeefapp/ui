import { rectGap, type GlassRect } from './geometry'

/**
 * How bubbles change when the layout changes, following Apple's glass rules:
 * - a new bubble within `spacing` of a bubble that just left (or of a living one) grows out of it
 *   (one bubble splitting into several);
 * - a bubble that leaves within `spacing` of a new or living bubble is absorbed into it (several
 *   bubbles merging into one);
 * - anything farther away materializes in place or dematerializes where it was.
 */
export type GlassBirth =
  /** Start at `from` (the source bubble's current rect) and spring to the target. */
  | { id: string; kind: 'grow'; source: string; from: GlassRect }
  /** Start as a point at the target's centre and spring open. */
  | { id: string; kind: 'materialize' }

export type GlassDeath =
  /** Keep drawing the leaving bubble while it springs into `into`, then drop it. */
  | { id: string; kind: 'absorb'; target: string; into: GlassRect }
  /** Shrink to a point and drop it. */
  | { id: string; kind: 'dematerialize' }

export type GlassPlan = { births: GlassBirth[]; deaths: GlassDeath[] }

const overlap = (a: GlassRect, b: GlassRect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))

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
    // Prefer a bubble that just left (a split or a replacement), then a living neighbour.
    const source = nearest(rect, leaving, spacing) ?? nearest(rect, staying, spacing)
    births.push(source ? { id, kind: 'grow', source: source.id, from: source.rect } : { id, kind: 'materialize' })
  }
  const deaths: GlassDeath[] = []
  for (const [id, rect] of leaving) {
    // In a split the parent is absorbed into the child it overlaps most while the children
    // grow out of it, so the glass never has a gap.
    const target = nearest(rect, next, spacing)
    deaths.push(target ? { id, kind: 'absorb', target: target.id, into: target.rect } : { id, kind: 'dematerialize' })
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
