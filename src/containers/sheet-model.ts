/** Pure geometry for LabSheet: detent heights, where a release lands, and the dimming. */
import { nearestTarget, projectMomentum, rubberBand } from '../physics/spring'

/**
 * A height a sheet can rest at: `medium` (half the screen), `large` (almost full), `fit` (its
 * content, up to large), a pixel height, or a percentage of the screen like `'35%'`.
 */
export type LabSheetDetent = 'medium' | 'large' | 'fit' | number | `${number}%`

export type LabSheetMetrics = {
  /** Height of the area the sheet covers (the viewport, or the container). */
  hostHeight: number
  /** Gap kept above a large sheet (safe area + breathing room). */
  topInset: number
  /** The sheet's natural content height, for `fit`. */
  natural: number
}

/** Pixel height of one detent, clamped to [0, large]. */
export function detentHeight(detent: LabSheetDetent, m: LabSheetMetrics) {
  const large = Math.max(0, m.hostHeight - m.topInset)
  const value =
    detent === 'large'
      ? large
      : detent === 'medium'
        ? m.hostHeight * 0.5
        : detent === 'fit'
          ? m.natural
          : typeof detent === 'number'
            ? detent
            : (parseFloat(detent) / 100) * m.hostHeight
  return Math.round(Math.max(0, Math.min(large, value)))
}

/** Every detent's height, in the order given. */
export function detentHeights(detents: readonly LabSheetDetent[], m: LabSheetMetrics) {
  return detents.map((d) => detentHeight(d, m))
}

/**
 * The visible height while a finger drags the sheet: 1:1 between its lowest and highest rest
 * heights, rubber-banded above the highest, and below the lowest either free (dismissible, down
 * to 0) or rubber-banded.
 */
export function dragHeight(raw: number, heights: readonly number[], hostHeight: number, dismissible: boolean) {
  const min = Math.min(...heights),
    max = Math.max(...heights)
  if (raw > max) return max + rubberBand(raw - max, hostHeight)
  if (raw < min) return dismissible ? Math.max(0, raw) : min + rubberBand(raw - min, hostHeight)
  return raw
}

/**
 * Where a released sheet goes. `velocity` is upward speed in px/s (positive = growing). The
 * height is projected with the flick's momentum and snapped to the nearest detent, or to 0
 * (dismiss) when that is nearer and the sheet is dismissible.
 */
export function releaseTarget(
  visible: number,
  velocity: number,
  heights: readonly number[],
  dismissible: boolean
): { height: number; index: number; dismiss: boolean } {
  const projected = projectMomentum(visible, velocity, 0.99)
  const targets = dismissible ? [0, ...heights] : [...heights]
  const height = nearestTarget(projected, targets)
  if (dismissible && height === 0) return { height: 0, index: -1, dismiss: true }
  return { height, index: heights.indexOf(height), dismiss: false }
}

/** Scrim strength 0–1: full at or above the lowest detent, fading as the sheet leaves. */
export function sheetDim(visible: number, heights: readonly number[]) {
  const min = Math.max(1, Math.min(...heights))
  return Math.max(0, Math.min(1, visible / min))
}

/**
 * How far the page behind should recede (0–1): only as the sheet rises from below `large`
 * toward full height, like an iOS page sheet stacking over its presenter.
 */
export function sheetRecede(visible: number, large: number) {
  const start = large * 0.72
  if (large <= 0 || visible <= start) return 0
  return Math.max(0, Math.min(1, (visible - start) / (large - start)))
}
