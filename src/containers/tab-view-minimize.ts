/**
 * The tab bar's minimize morph as pure geometry (twin: flutter/lib/containers/tab_view_minimize.dart).
 * One progress value runs from 0 (the full bar, the accessory above it) to 1 (the selected tab as a
 * round bubble at the leading edge, the accessory filling the rest of the row). Scrolling moves the
 * progress; every frame places the pieces between the boxes measured at rest.
 */

export type MinimizeBox = { x: number; y: number; width: number; height: number }

/** Boxes measured with the bar full, in the chrome's coordinates. */
export type MinimizeBoxes = {
  chrome: MinimizeBox
  bar: MinimizeBox
  /** The selected tab. */
  option: MinimizeBox
  /** How far the selected tab's icon is from the tab's centre (it moves there as the label goes). */
  icon: { dx: number; dy: number }
  accessory: MinimizeBox | null
  /** Space between the accessory and the bar. */
  gap: number
  rtl: boolean
}

export type MinimizeFrame = {
  bar: { x: number; y: number; width: number }
  accessory: { x: number; y: number; width: number } | null
  /** Moves the tabs so the selected one ends centred in the round bubble. */
  trackShift: number
  /** Moves the selected icon to the centre of its tab. */
  icon: { dx: number; dy: number }
}

/** Scroll distance (px) that takes the bar from full to minimized. */
export const MINIMIZE_DISTANCE = 56
/** Scrolling back up restores it over a shorter distance, so the bar returns readily. */
export const RESTORE_DISTANCE = 40
/** Within this distance of the top the bar can't be more minimized than the scroll position allows. */
export const MINIMIZE_TOP = 24

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** The bar gives up its width early... */
const early = (t: number) => 1 - (1 - t) ** 4
/** ...and the accessory drops into the row only once the bar has made room (smoothstep, delayed). */
const descend = (t: number) => {
  const u = clamp01((t - 0.35) / 0.65)
  return u * u * (3 - 2 * u)
}

/** The progress after the content scrolled by `delta` px to `top`. */
export function minimizeProgress(progress: number, delta: number, top: number) {
  if (top <= 0) return 0
  const next = progress + delta / (delta > 0 ? MINIMIZE_DISTANCE : RESTORE_DISTANCE)
  return clamp01(Math.min(next, top / MINIMIZE_TOP))
}

/** Where the pieces sit at progress `t`. */
export function minimizeGeometry(at: MinimizeBoxes, t: number): MinimizeFrame {
  const p = clamp01(t)
  const round = at.bar.height
  const barEnd = at.rtl ? at.chrome.width - round : 0
  const shrink = early(p)
  const bar = { x: lerp(at.bar.x, barEnd, shrink), y: at.bar.y, width: lerp(at.bar.width, round, shrink) }
  let accessory: MinimizeFrame['accessory'] = null
  if (at.accessory) {
    const a = at.accessory
    const y = lerp(a.y, at.bar.y + (at.bar.height - a.height) / 2, descend(p))
    // Its outer edge glides to the chrome's edge; its inner edge never crosses the shrinking bar
    // once the two share a row, so the accessory makes room as the bar gives it.
    const sharesRow = y + a.height > at.bar.y
    if (at.rtl) {
      const left = lerp(a.x, 0, shrink)
      let right = lerp(a.x + a.width, at.chrome.width - round - at.gap, shrink)
      if (sharesRow) right = Math.min(right, bar.x - at.gap)
      accessory = { x: left, y, width: Math.max(0, right - left) }
    } else {
      const right = lerp(a.x + a.width, at.chrome.width, shrink)
      let left = lerp(a.x, round + at.gap, shrink)
      if (sharesRow) left = Math.max(left, bar.x + bar.width + at.gap)
      accessory = { x: left, y, width: Math.max(0, right - left) }
    }
  }
  const optionCentre = at.option.x - at.bar.x + at.option.width / 2
  return {
    bar,
    accessory,
    trackShift: (round / 2 - optionCentre) * shrink,
    icon: { dx: at.icon.dx * p, dy: at.icon.dy * p },
  }
}
