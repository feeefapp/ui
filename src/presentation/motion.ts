'use client'

import * as React from 'react'
import { MotionValue, motionOf, prefersReducedMotion } from '../physics/motion-value'
import { SPRINGS, type Spring } from '../physics/spring'
import { motionFade } from '../theme-config'

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
} as const

/** Surface scale at a given open progress (1 = open; past 1 while the spring overshoots). */
export function popScale(progress: number) {
  return POP_MOTION.fromScale - (POP_MOTION.fromScale - 1) * progress
}

/**
 * Drives the pop motion on `surface` (transform, opacity) and `scrim` (opacity). Calls
 * `onExited` once a close has faded out completely.
 */
export function usePopMotion(
  open: boolean,
  surface: React.RefObject<HTMLElement | null>,
  scrim: React.RefObject<HTMLElement | null>,
  onExited: () => void
) {
  const progress = React.useRef(new MotionValue(0, 0.001)).current
  const fade = React.useRef(new MotionValue(0, 0.002)).current
  const exited = React.useRef(onExited)
  exited.current = onExited

  React.useLayoutEffect(() => {
    const paint = () => {
      const element = surface.current
      const opacity = Math.max(0, Math.min(1, fade.get()))
      if (element) {
        const scale = popScale(progress.get())
        // At rest no transform or opacity stays behind: glass inside needs a clean backdrop root.
        element.style.transform = Math.abs(scale - 1) < 1e-4 ? '' : `scale(${scale})`
        element.style.opacity = opacity >= 1 ? '' : String(opacity)
      }
      if (scrim.current) scrim.current.style.opacity = String(opacity)
    }
    const off = [progress.subscribe(paint), fade.subscribe(paint)]
    paint()
    return () => {
      off.forEach((stop) => stop())
      progress.stop()
      fade.stop()
    }
  }, [])

  React.useLayoutEffect(() => {
    const motion = motionOf()
    if (open) {
      if (prefersReducedMotion()) {
        progress.set(1)
        const length = motionFade(motion, POP_MOTION.fadeOut)
        void fade.animateTo(1, { spring: { duration: length, bounce: 0 }, instant: length === 0 })
        return
      }
      void progress.animateTo(1, { spring: POP_MOTION.spring })
      void fade.animateTo(1, { spring: { duration: POP_MOTION.fadeIn, bounce: 0 } })
      return
    }
    const length = motionFade(motion, POP_MOTION.fadeOut)
    void fade
      .animateTo(0, { spring: { duration: length, bounce: 0 }, instant: length === 0 })
      .then((arrived) => {
        if (arrived) exited.current()
      })
  }, [open])
}
