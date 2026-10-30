/**
 * Pure geometry for Sheet: detent heights, where a release lands, the dimming, and the iOS 26/27
 * floating frame (a partial-height sheet floats inset from the edges on glass; rising toward full
 * height it reaches the edges and turns opaque, continuously with the height).
 */
import { mix, nearestTarget, projectMomentum, rubberBand } from '../physics/spring'

/**
 * A height a sheet can rest at: `peek` (just its header, like the Maps search bar), `medium` (half
 * the screen), `large` (almost full), `fit` (its content, up to large), a pixel height, or a
 * percentage of the screen like `'35%'`.
 */
export type SheetDetent = 'peek' | 'medium' | 'large' | 'fit' | number | `${number}%`

export type SheetMetrics = {
  /** Height of the area the sheet covers (the viewport, or the container). */
  hostHeight: number
  /** Gap kept above a large sheet (safe area + breathing room). */
  topInset: number
  /** The sheet's natural content height, for `fit`. */
  natural: number
  /** The grabber plus the floating header and its gaps, for `peek`. */
  peek?: number
}

/** Pixel height of one detent, clamped to [0, large]. */
export function detentHeight(detent: SheetDetent, m: SheetMetrics) {
  const large = Math.max(0, m.hostHeight - m.topInset)
  const value =
    detent === 'large'
      ? large
      : detent === 'medium'
        ? m.hostHeight * 0.5
        : detent === 'fit'
          ? m.natural
          : detent === 'peek'
            ? (m.peek ?? 72)
            : typeof detent === 'number'
              ? detent
              : (parseFloat(detent) / 100) * m.hostHeight
  return Math.round(Math.max(0, Math.min(large, value)))
}

/** Every detent's height, in the order given. */
export function detentHeights(detents: readonly SheetDetent[], m: SheetMetrics) {
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
 * The height after one wheel or trackpad step of `delta` px (> 0 grows): up to `max`, down to
 * `min`, and on a dismissible sheet on below `min` at half speed, so scrolling up at the content's
 * top keeps pulling the sheet down until it can close ([wheelDismisses]).
 */
export function wheelHeight(visible: number, delta: number, min: number, max: number, dismissible: boolean) {
  if (delta > 0) return Math.min(max, visible + delta)
  if (!dismissible) return Math.max(min, Math.min(visible, max) + delta)
  // Above `min` 1:1, the part of the step below it at half speed.
  const above = Math.max(0, visible - min)
  const step = -delta
  return step <= above ? visible - step : Math.max(0, Math.min(visible, min) - (step - above) * 0.5)
}

/** A sheet the wheel pulled to `visible`, below its lowest height `min`, closes when it stops. */
export function wheelDismisses(visible: number, min: number) {
  return min - visible >= Math.min(64, min * 0.35)
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

/**
 * Scrim strength 0–1. Without `undimmed`: full at or above the lowest detent, fading as the sheet
 * leaves. With `undimmed` (the height up to which the page stays usable, iOS
 * `presentationBackgroundInteraction(.enabled(upThrough:))`): none up to it, rising to full at the
 * next detent above it (or at `large` when there is none).
 */
export function sheetDim(visible: number, heights: readonly number[], undimmed?: number | null, large?: number) {
  if (undimmed == null) {
    const min = Math.max(1, Math.min(...heights))
    return clamp01(visible / min)
  }
  const above = heights.filter((h) => h > undimmed + 0.5)
  const full = above.length ? Math.min(...above) : (large ?? Math.max(...heights))
  if (full <= undimmed) return 0
  return clamp01((visible - undimmed) / (full - undimmed))
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

/** How the sheet's surface is drawn at one height. */
export type SheetFrame = {
  /** 0 at the lowest partial height, 1 at full height (attached). */
  expansion: number
  /** Gap in px between the surface and the side and bottom edges. */
  gap: number
  /** Radius in px of the bottom corners (the top corners keep the sheet radius). */
  bottomRadius: number
  /** Opacity 0–1 of the opaque surface over the glass. */
  solid: number
}

export type SheetFrameOptions = {
  /** Rest heights. */
  heights: readonly number[]
  /** Full height (the `large` detent's height, attached to the edges). */
  large: number
  /** Gap of a floating sheet in px. */
  inset: number
  /** The sheet's corner radius in px. */
  radius: number
  /**
   * `float` (a phone sheet with a partial detent): inset on glass, reaching the edges and turning
   * opaque as it rises to `large`. `attached`: always edge to edge and opaque (a sheet with only
   * full-height detents, as on iOS). `card` (iPad Maps): always floating glass.
   */
  mode: 'float' | 'attached' | 'card'
}

/**
 * The surface at `visible` height. Floating: full gap and glass up to the lowest partial detent,
 * then the gap closes and the bottom corners square off along a smoothstep as the sheet rises to
 * full height (so a medium detent sits closer to the edges, as in Maps), while the opaque surface
 * fades in over the last stretch, reaching the edges exactly when it is fully opaque.
 */
export function sheetFrame(visible: number, o: SheetFrameOptions): SheetFrame {
  if (o.mode === 'attached') return { expansion: 1, gap: 0, bottomRadius: 0, solid: 1 }
  if (o.mode === 'card') return { expansion: 0, gap: o.inset, bottomRadius: o.radius, solid: 0 }
  const partial = o.heights.filter((h) => h < o.large - 0.5)
  const low = partial.length ? Math.min(...partial) : 0
  const span = o.large - low
  const expansion = span > 0 ? clamp01((visible - low) / span) : 1
  const close = smooth(expansion)
  return {
    expansion,
    gap: o.inset * (1 - close),
    bottomRadius: o.radius * (1 - smooth(clamp01((expansion - 0.35) / 0.65))),
    solid: smooth(clamp01((expansion - 0.55) / 0.45)),
  }
}

/** A rectangle in host pixels. */
export type SheetRect = { x: number; y: number; width: number; height: number }

/** One frame of the morph out of (or back into) the control that opened the sheet. */
export type SheetMorphFrame = {
  /** Panel transform: moves the clip window over the source at p = 0. */
  transform: string
  /** Panel clip-path: the source's size at p = 0, the whole panel at p = 1. */
  clip: string
  /** Opacity of the sheet's content. */
  content: number
}

/**
 * The sheet growing out of the button that opened it (iOS 26 `matchedTransitionSource`): at
 * `p` = 0 the panel is clipped to the source's size, its top centred on the source; at 1 it is
 * the panel at rest. Corners go from the source's radius to the sheet's. `panel` and `source` are
 * in the same pixels; the clip window grows from the panel's top centre, so the header arrives
 * first, and the content fades in as it arrives.
 */
export function sheetMorphFrame(p: number, panel: SheetRect, source: SheetRect, sourceRadius: number, radius: number): SheetMorphFrame {
  const t = Math.max(0, p)
  const width = Math.max(0, mix(source.width, panel.width, t))
  const height = Math.max(0, mix(source.height, panel.height, t))
  const dx = (source.x + source.width / 2 - (panel.x + panel.width / 2)) * (1 - t)
  const dy = (source.y - panel.y) * (1 - t)
  const side = Math.max(0, (panel.width - width) / 2)
  const bottom = Math.max(0, panel.height - height)
  const r = mix(Math.min(sourceRadius, source.height / 2, source.width / 2), radius, clamp01(t))
  return {
    transform: `translate3d(${round(dx)}px, ${round(dy)}px, 0)`,
    clip: `inset(0px ${round(side)}px ${round(bottom)}px ${round(side)}px round ${round(r)}px)`,
    content: smooth(clamp01(t / 0.8)),
  }
}

/** The detent a text field focused at `index` should raise the sheet to, or null to stay. */
export function focusRaise(
  detents: readonly SheetDetent[],
  heights: readonly number[],
  index: number,
  focusDetent: SheetDetent | null | undefined
): number | null {
  if (focusDetent === null) return null
  const target =
    focusDetent !== undefined
      ? detents.indexOf(focusDetent)
      : detents[index] === 'peek'
        ? heights.indexOf(Math.max(...heights))
        : -1
  if (target < 0 || heights[target] <= (heights[index] ?? 0)) return null
  return target
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
function smooth(t: number) {
  return t * t * (3 - 2 * t)
}
function round(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Where a released free sheet (`snap={false}`) comes to rest: the flick's momentum projected and
 * kept between the lowest and highest detents, or dismissed when it is flung below half the lowest
 * one and the sheet is dismissible.
 */
export function freeTarget(
  visible: number,
  velocity: number,
  heights: readonly number[],
  dismissible: boolean
): { height: number; dismiss: boolean } {
  const min = Math.min(...heights),
    max = Math.max(...heights)
  const projected = projectMomentum(visible, velocity, 0.99)
  if (dismissible && projected < min / 2) return { height: 0, dismiss: true }
  return { height: Math.max(min, Math.min(max, projected)), dismiss: false }
}

/** The nearest detent index to a free height. */
export function nearestDetent(height: number, heights: readonly number[]) {
  let best = 0
  heights.forEach((h, i) => {
    if (Math.abs(h - height) < Math.abs(heights[best] - height)) best = i
  })
  return best
}

/** One gesture over a resizable sheet's content: the sheet's unclamped height and the scroll. */
export type SheetScrollState = { raw: number; scroll: number }

/**
 * Splits one finger movement over the content between the sheet and its scroll, like iOS sheets
 * and Flutter's DraggableScrollableSheet. `delta` > 0 moves the content up (finger up): the sheet
 * grows to `max` first, then the content scrolls to `scrollMax` and stops there; content that does
 * not scroll lets the sheet stretch past `max`. `delta` < 0 undoes that in reverse: the stretch, then the scroll back to the top, then the
 * sheet shrinks (below its lowest detent the caller's `dragHeight` applies). `raw` is the height
 * before rubber-banding.
 */
export function sheetScrollStep(state: SheetScrollState, delta: number, max: number, scrollMax: number): SheetScrollState {
  let { raw, scroll } = state
  let d = delta
  if (d > 0) {
    const grow = Math.max(0, Math.min(d, max - raw))
    raw += grow
    d -= grow
    const scrolled = Math.max(0, Math.min(d, scrollMax - scroll))
    scroll += scrolled
    d -= scrolled
    // Content that scrolls stops at its end, like a list; a sheet with nothing to scroll stretches.
    if (scrollMax <= 0) raw += d
  } else if (d < 0) {
    const unstretch = Math.max(0, Math.min(-d, raw - max))
    raw -= unstretch
    d += unstretch
    const back = Math.max(0, Math.min(-d, scroll))
    scroll -= back
    d += back
    raw += d
  }
  return { raw, scroll }
}

/** iOS UIScrollView's normal deceleration per ms, for content flung inside a sheet. */
export const SCROLL_DECELERATION = 0.998

/**
 * One step of a content fling: `velocity` (px/s, positive = content moving up / scroll growing)
 * decays by `rate` per ms. Returns the scroll after `ms` and the velocity left.
 */
export function flingStep(scroll: number, velocity: number, ms: number, rate = SCROLL_DECELERATION) {
  const decay = Math.pow(rate, ms)
  const travel = ((velocity / 1000) * rate * (1 - decay)) / (1 - rate)
  return { scroll: scroll + travel, velocity: velocity * decay }
}
