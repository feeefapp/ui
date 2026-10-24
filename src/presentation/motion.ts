'use client'

import * as React from 'react'
import { motionOf } from '../physics/motion-value'
import { SPRINGS, springTiming, type Spring } from '../physics/spring'
import type { Motion } from '../theme-config'
import { GLASS_INSTANT_ATTRIBUTE } from '../glass/transitions'

/**
 * How centred dialogs (Alert, Modal) come and go, like iOS alerts: they open with a spring from
 * a little larger than their size while fading in, and close with a fade only (no scale on exit).
 * Reduced motion crossfades; `motion: 'none'` is instant. The page's dimming follows the fade.
 */
export const POP_MOTION = {
  /** Scale the surface opens from. */
  fromScale: 1.1,
  /** The scale spring (a small overshoot). */
  spring: SPRINGS.snappy as Spring,
  /** Fade-in length in seconds. */
  fadeIn: 0.2,
  /** Fade-out length in seconds (also the reduced-motion crossfade). */
  fadeOut: 0.2,
  /** The fade's curve, in and out: quick at first and exactly done at its length, with no tail. */
  fadeEasing: 'cubic-bezier(0, 0, 0.58, 1)',
} as const

/** How a Pane slides in and out (the scrim dims on the same timing). */
export const SLIDE_MOTION = {
  spring: SPRINGS.smooth as Spring,
  /** Reduced-motion crossfade length in seconds. */
  fade: 0.2,
} as const

/** Surface scale at a given open progress (1 = open; past 1 while the spring overshoots). */
export function popScale(progress: number) {
  return POP_MOTION.fromScale - (POP_MOTION.fromScale - 1) * progress
}

/** One property animated from where it is now to where it rests. */
export type SurfaceTrack = { property: 'transform' | 'opacity'; from: string; to: string; duration: number; easing: string }

/**
 * A surface's motion for one open or close: its tracks (transform and opacity only, so the
 * compositor runs them) and the scrim's opacity on the same timing, so the dim moves in step.
 */
export type SurfacePlan = { surface: SurfaceTrack[]; scrim: SurfaceTrack | null }

/** Where the surface is when a motion starts, read mid-flight; null when it enters from nothing. */
export type SurfaceNow = { opacity: number; transform: string; scrim: number }

type Timing = { duration: number; easing: string }

/** A spring as a CSS easing; browsers without `linear()` get a close cubic curve. */
export function springEasing(spring: Spring): Timing {
  const timing = springTiming(spring)
  const linear = typeof CSS === 'undefined' || typeof CSS.supports !== 'function' || CSS.supports('animation-timing-function', 'linear(0, 1)')
  return linear ? timing : { duration: timing.duration, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }
}

const fade = (seconds: number, share = 1): Timing => ({
  duration: Math.round(seconds * 1000 * Math.max(0, Math.min(1, share))),
  easing: POP_MOTION.fadeEasing,
})

const track = (property: SurfaceTrack['property'], from: string | number, to: string | number, timing: Timing): SurfaceTrack => ({
  property,
  from: String(from),
  to: String(to),
  ...timing,
})

const atRest = (transform: string) => transform === 'none' || transform === '' || transform === 'matrix(1, 0, 0, 1, 0, 0)'

/**
 * The pop motion (Alert, Modal). Opening from nothing springs the scale from `fromScale` and fades
 * in; opening again while closing fades back from where it is. Closing only fades, ending exactly
 * at `fadeOut`. The scrim always shares the fade's timing.
 */
export function popPlan(open: boolean, motion: Motion, now: SurfaceNow | null): SurfacePlan {
  if (motion === 'none') return { surface: [], scrim: null }
  const opacity = now?.opacity ?? 0
  const scrim = now?.scrim ?? 0
  const reduced = motion === 'reduced'
  if (open) {
    const timing = reduced ? fade(POP_MOTION.fadeOut, 1 - opacity) : fade(POP_MOTION.fadeIn, 1 - opacity)
    const surface: SurfaceTrack[] = []
    if (!reduced && !now) surface.push(track('transform', `scale(${POP_MOTION.fromScale})`, 'none', springEasing(POP_MOTION.spring)))
    else if (!reduced && now && !atRest(now.transform)) surface.push(track('transform', now.transform, 'none', springEasing(POP_MOTION.spring)))
    if (timing.duration > 0) surface.push(track('opacity', opacity, 1, timing))
    return { surface, scrim: timing.duration > 0 ? track('opacity', scrim, 1, timing) : null }
  }
  const timing = fade(POP_MOTION.fadeOut, opacity)
  const surface: SurfaceTrack[] = []
  // A close while the pop still springs lets the scale finish as it fades.
  if (now && !atRest(now.transform)) surface.push(track('transform', now.transform, 'none', springEasing(POP_MOTION.spring)))
  if (timing.duration > 0) surface.push(track('opacity', opacity, 0, timing))
  return { surface, scrim: timing.duration > 0 ? track('opacity', scrim, 0, timing) : null }
}

/**
 * The slide motion (Pane): in from `offset` (a transform that puts it off screen) and back out,
 * on one spring, with the scrim on the same timing. Reduced motion crossfades instead.
 */
export function slidePlan(open: boolean, motion: Motion, now: SurfaceNow | null, offset: string): SurfacePlan {
  if (motion === 'none') return { surface: [], scrim: null }
  const scrim = now?.scrim ?? 0
  if (motion === 'reduced') {
    const opacity = now?.opacity ?? 0
    const timing = fade(SLIDE_MOTION.fade, open ? 1 - opacity : opacity)
    if (!timing.duration) return { surface: [], scrim: null }
    return { surface: [track('opacity', opacity, open ? 1 : 0, timing)], scrim: track('opacity', scrim, open ? 1 : 0, timing) }
  }
  const timing = springEasing(SLIDE_MOTION.spring)
  const surface = [track('transform', now ? now.transform : offset, open ? 'none' : offset, timing)]
  // Opened again mid-crossfade (the motion setting changed): back to full opacity as it moves.
  if (open && now && now.opacity < 1) surface.push(track('opacity', now.opacity, 1, timing))
  return { surface, scrim: track('opacity', scrim, open ? 1 : 0, timing) }
}

/** The inline value that holds a track's end state once its animation is gone. */
const restValue = (track: SurfaceTrack) =>
  (track.property === 'opacity' && track.to === '1') || (track.property === 'transform' && track.to === 'none') ? '' : track.to

function play(element: HTMLElement, tracks: SurfaceTrack[]) {
  if (typeof element.animate !== 'function') return []
  return tracks
    .filter((track) => track.duration > 0)
    .map((track) =>
      element.animate(
        [{ [track.property]: track.from }, { [track.property]: track.to }],
        { duration: track.duration, easing: track.easing, fill: 'none' }
      )
    )
}

/**
 * Runs a presentation surface's motion on the compositor: Web Animations of transform and opacity
 * only, with `will-change` set just while they run, and the scrim on the same timing. Each
 * change of `open` sets the end state inline and animates from wherever the surface is (mid-flight
 * after an interruption), so nothing is left behind at rest. While it moves, the surface carries
 * `data-glass-instant`: the glass inside rides its transform and leaves in the same frames.
 * `onExited` runs once a close has fully ended.
 */
export function useSurfaceMotion(
  open: boolean,
  surface: React.RefObject<HTMLElement | null>,
  scrim: React.RefObject<HTMLElement | null>,
  onExited: () => void,
  plan: (open: boolean, motion: Motion, now: SurfaceNow | null, element: HTMLElement) => SurfacePlan
) {
  const exited = React.useRef(onExited)
  exited.current = onExited
  const planner = React.useRef(plan)
  planner.current = plan
  const running = React.useRef<Animation[]>([])
  const entered = React.useRef(false)
  const held = React.useRef<number[]>([])
  const release = () => {
    for (const frame of held.current) cancelAnimationFrame(frame)
    held.current = []
  }

  React.useLayoutEffect(
    () => () => {
      release()
      for (const animation of running.current) animation.cancel()
      running.current = []
      // Mounted again (React's development double mount): it enters from nothing again.
      entered.current = false
    },
    []
  )

  React.useLayoutEffect(() => {
    const element = surface.current
    if (!element) return
    const dim = scrim.current
    let now: SurfaceNow | null = null
    if (entered.current) {
      const style = getComputedStyle(element)
      now = { opacity: Number(style.opacity), transform: style.transform, scrim: dim ? Number(getComputedStyle(dim).opacity) : 0 }
    }
    const fresh = !entered.current
    entered.current = true
    release()
    for (const animation of running.current) animation.cancel()
    running.current = []
    const { surface: tracks, scrim: dimTrack } = planner.current(open, motionOf(), now, element)
    const properties = [...new Set(tracks.map((track) => track.property))]
    const rest = () => {
      element.removeAttribute(GLASS_INSTANT_ATTRIBUTE)
      element.style.willChange = ''
    }

    // The end state, inline: what shows once the animations end (and at once without them).
    const settleInline = () => {
      element.style.transform = ''
      element.style.opacity = ''
      if (!open) for (const track of tracks) element.style[track.property] = restValue(track)
      if (dim) dim.style.opacity = open ? '1' : '0'
    }
    const start = () => {
      settleInline()
      const played = tracks.filter((track) => track.duration > 0)
      const own = play(element, played)
      const dimmed = dim && dimTrack ? play(dim, [dimTrack]) : []
      const animations = [...own, ...dimmed]
      running.current = animations
      // A close is over once nothing shows: when its fades end, even if a scale still springs
      // (closed mid-pop), so the page is never blocked by an invisible surface.
      const fades = own.filter((_, i) => played[i].property === 'opacity')
      const awaited = !open && fades.length ? [...fades, ...dimmed] : animations
      if (!animations.length) {
        rest()
        // A close with nothing to animate still leaves the screen: no full-opacity frame first.
        if (!open) {
          element.style.opacity = '0'
          exited.current()
        }
        return
      }
      Promise.all(awaited.map((animation) => animation.finished)).then(
        () => {
          if (running.current !== animations) return
          running.current = []
          for (const animation of animations) animation.cancel()
          rest()
          if (!open) exited.current()
        },
        () => {
          // Cancelled: the next motion took over.
        }
      )
    }
    if (!tracks.length && !dimTrack) {
      start()
      return
    }
    element.setAttribute(GLASS_INSTANT_ATTRIBUTE, '')
    element.style.willChange = properties.join(', ')
    if (!fresh || !open || typeof requestAnimationFrame === 'undefined') {
      start()
      return
    }
    // Entering from nothing: the first frame (style, layout, its glass and raster) is the costly
    // one. Hold the surface at its first keyframe through that frame and start the motion on the
    // next, so the animation's clock begins once the surface can actually be shown: never a
    // faint first frame followed by a jump.
    for (const track of tracks) element.style[track.property] = track.from
    if (dim) dim.style.opacity = dimTrack?.from ?? '0'
    held.current = [
      requestAnimationFrame(() => {
        held.current = [requestAnimationFrame(start)]
      }),
    ]
  }, [open])
}

/** The pop motion on `surface` (transform, opacity) and `scrim` (opacity). */
export function usePopMotion(
  open: boolean,
  surface: React.RefObject<HTMLElement | null>,
  scrim: React.RefObject<HTMLElement | null>,
  onExited: () => void
) {
  useSurfaceMotion(open, surface, scrim, onExited, popPlan)
}
