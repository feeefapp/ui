/**
 * The menu's motion around its glass: the glass itself is a GlassContainer shape born out of the
 * menu's button and returning into it (`GLASS_ORIGIN_SPRINGS`, glass/transitions.ts); this is what
 * the rows and the button do meanwhile, fitted to iOS 26 menus measured on the simulator
 * (research/liquid-glass/CONTROLS-MEASURED.md §8, data/controls-menu.json). Pure, no DOM:
 * `menu-surface.tsx` plays it on the web and `flutter/lib/menu/morph_model.dart` is its twin
 * (vectors in flutter/test/fixtures/menu.json).
 */
import { mix } from '../physics/spring'
import { motionFade, type Motion } from '../theme-config'

/** The menu's rows at one moment: they sit in the glass from its first frame, blurred and faint. */
export type MenuContentFrame = {
  /** Opacity of the rows. */
  opacity: number
  /** Blur of the rows in px (0 = sharp). */
  blur: number
  /** True once they no longer change. */
  settled: boolean
}

/** The measured timings (seconds). */
export const MENU_MORPH = {
  /** Rows start this blurred (px) and this faint, then sharpen as the glass arrives. */
  contentBlur: 10,
  contentOpacity: 0.2,
  /** Rows reach full contrast (opacity) and full sharpness by these times. */
  contrastBy: 0.3,
  sharpBy: 0.42,
  /** The button hides once the glass covers it, and reappears as the glass lands back in it. */
  hideTrigger: 0.06,
  revealTrigger: 0.16,
  /** Dismissal: the rows are gone within this. */
  closeContent: 0.05,
  /** Dismissal: the glass has landed back in the button (`SPRINGS.menuDismiss` settled within half
   * a pixel over 250 px) and the menu can unmount (`--lab-menu-exit` is this plus a frame). */
  closeEnd: 0.48,
  /** Reduced motion: a short crossfade of the rows in and out instead. */
  fadeIn: 0.15,
  fadeOut: 0.1,
} as const

/** How long a dismissal takes in seconds, for the host that keeps the menu mounted until it ends. */
export function menuCloseDuration(motion: Motion = 'full') {
  return motion === 'full' ? MENU_MORPH.closeEnd : motionFade(motion, MENU_MORPH.fadeOut)
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
/** Hermite smoothstep of `value` between `from` and `to`. */
export function smoothstep(from: number, to: number, value: number) {
  const t = clamp01((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

/** The rows `t` seconds after the menu started opening (its glass leaving the button). */
export function menuContentOpenFrame(t: number, motion: Motion = 'full'): MenuContentFrame {
  const time = Math.max(0, t)
  if (motion !== 'full') {
    const duration = motionFade(motion, MENU_MORPH.fadeIn)
    return { opacity: duration === 0 ? 1 : smoothstep(0, duration, time), blur: 0, settled: time >= duration }
  }
  return {
    opacity: 1 - (1 - MENU_MORPH.contentOpacity) * (1 - smoothstep(0, MENU_MORPH.contrastBy, time)),
    blur: MENU_MORPH.contentBlur * (1 - smoothstep(0, MENU_MORPH.sharpBy, time)),
    settled: time >= MENU_MORPH.sharpBy,
  }
}

/**
 * The rows `t` seconds after the menu started closing from `from` (the frame on screen, so a menu
 * closed while still opening turns around where it is): they go first, before the glass flies back.
 */
export function menuContentCloseFrame(t: number, from: MenuContentFrame, motion: Motion = 'full'): MenuContentFrame {
  const time = Math.max(0, t)
  if (motion !== 'full') {
    const duration = motionFade(motion, MENU_MORPH.fadeOut)
    const gone = duration === 0 ? 1 : smoothstep(0, duration, time)
    return { opacity: from.opacity * (1 - gone), blur: from.blur, settled: time >= duration }
  }
  const gone = smoothstep(0, MENU_MORPH.closeContent, time)
  return {
    opacity: from.opacity * (1 - gone),
    blur: mix(from.blur, MENU_MORPH.contentBlur, gone),
    settled: time >= MENU_MORPH.closeContent,
  }
}

/**
 * Which edge of its trigger a menu lines up with (Radix `align`): a toolbar trigger lines up with
 * the edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
 * trigger is centred on. `triggerCenter`, `boundsLeft` and `boundsRight` are physical x positions.
 */
export function menuAlign(
  toolbar: boolean,
  triggerCenter: number,
  boundsLeft: number,
  boundsRight: number,
  rtl = false
): 'start' | 'center' | 'end' {
  if (!toolbar) return 'center'
  const left = triggerCenter <= (boundsLeft + boundsRight) / 2
  return left !== rtl ? 'start' : 'end'
}
