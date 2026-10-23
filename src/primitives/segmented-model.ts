import { mix, projectMomentum, rubberBandClamp } from '../physics/spring'

/**
 * Pure geometry of a segmented control's moving pill: where a drag puts it, how wide it is on the
 * way and where a release lands (its lens stretch is `lensStretch`, lens-model.ts). Shared with the
 * Flutter twin (`segmented_model.dart`, vectors in `flutter/test/fixtures/segmented.json`).
 */

/** One segment along the track, in px from the track's left edge (physical, never mirrored). */
export type SegmentSpan = {
  start: number
  width: number
  /** Disabled segments are never a release target. */
  disabled?: boolean
}

/** How far (px) the pill can be pulled past either end, with rubber-band resistance. */
export const SEGMENTED_OVERDRAG = 12
/** Deceleration a release is projected with (`projectMomentum`): quicker than a scroll view (0.99), so
 * a flick reaches the next segment without skipping one. */
export const SEGMENTED_DECELERATION = 0.97
/** Travel (px) before a press becomes a drag: mouse and pen, then touch. */
export const SEGMENTED_SLOP = { mouse: 4, touch: 10 } as const

/** Centre of a segment. */
export function segmentCenter(span: SegmentSpan) {
  return span.start + span.width / 2
}

/** Index of the segment under `x`; a point in a gap or past an end goes to the nearest segment. */
export function segmentIndexAt(x: number, spans: readonly SegmentSpan[]) {
  let best = -1
  let distance = Infinity
  spans.forEach((span, index) => {
    const d = x < span.start ? span.start - x : x > span.start + span.width ? x - span.start - span.width : 0
    if (d < distance) {
      best = index
      distance = d
    }
  })
  return best
}

/**
 * The pill's centre while dragged: the pointer less where it grabbed the pill, kept between the
 * first and last segment centres (so the pill stays on the track), with a slight rubber band past
 * either end.
 */
export function segmentedDragCenter(pointer: number, grab: number, spans: readonly SegmentSpan[]) {
  if (!spans.length) return pointer - grab
  return rubberBandClamp(
    pointer - grab,
    segmentCenter(spans[0]),
    segmentCenter(spans[spans.length - 1]),
    SEGMENTED_OVERDRAG
  )
}

/** The pill's width with its centre at `center`: it changes from one segment's width to the next. */
export function segmentedPillWidth(center: number, spans: readonly SegmentSpan[]) {
  if (!spans.length) return 0
  if (center <= segmentCenter(spans[0])) return spans[0].width
  for (let i = 0; i < spans.length - 1; i++) {
    const a = segmentCenter(spans[i])
    const b = segmentCenter(spans[i + 1])
    if (center <= b) return mix(spans[i].width, spans[i + 1].width, b === a ? 1 : (center - a) / (b - a))
  }
  return spans[spans.length - 1].width
}

/**
 * Where a released pill settles: the enabled segment nearest to where its momentum would carry it
 * (a quick flick reaches the next segment, a careful drop stays put). -1 when every one is disabled.
 */
export function segmentedSnapIndex(center: number, velocity: number, spans: readonly SegmentSpan[]) {
  const projected = projectMomentum(center, velocity, SEGMENTED_DECELERATION)
  let best = -1
  let distance = Infinity
  spans.forEach((span, index) => {
    if (span.disabled) return
    const d = Math.abs(segmentCenter(span) - projected)
    if (d < distance) {
      best = index
      distance = d
    }
  })
  return best
}
