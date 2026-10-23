'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { GLASS_GLOW_START, glassGlowRadius } from '../glass/press'
import { SPRINGS, springCoefficients } from '../physics/spring'
import { LENS_THUMB_SCALE, lensStretch } from './lens-model'
import { stepSpring, type StepSpringState } from './spring-core'
import { reducedMotionQuery } from '../physics/motion-value'

const SNAPPY = springCoefficients(SPRINGS.snappy)
const BOUNCY = springCoefficients(SPRINGS.bouncy)
const SMOOTH = springCoefficients(SPRINGS.smooth)
const INTERACTIVE = springCoefficients(SPRINGS.interactive)

/** Where the pointer is, in the control's own px: `x` from its inline start, `y` from its top. */
export type SliderPointer = { x: number; y: number }

/**
 * One spring clock for fill, thumb travel and the thumb's glass lens; never rerenders the owner.
 * While `pressed` the thumb turns into a lens (`lens-model.ts`): it grows by `LENS_THUMB_SCALE`,
 * stretches with its speed, shows the touch glow at the pointer (`pointer()`) and springs back on
 * release, on the segmented pill's springs. Reduced motion and a disabled control skip all of it.
 */
export function useSliderMotion(
  host: RefObject<HTMLDivElement | null>,
  target: number,
  tracking: boolean,
  pressed: boolean,
  thin: boolean,
  disabled: boolean,
  /** Lets a dragged switch thumb rubber-band past its ends instead of clamping to 0–1. */
  overshoot = false
) {
  const simulation = useRef({
    position: target,
    velocity: 0,
    press: { position: 1, velocity: 0 } as StepSpringState,
    lens: { position: 0, velocity: 0 } as StepSpringState,
    stretch: { position: 0, velocity: 0 } as StepSpringState,
    glowRadius: { position: GLASS_GLOW_START, velocity: 0 } as StepSpringState,
    glowOpacity: { position: 0, velocity: 0 } as StepSpringState,
    lensing: false,
    /** Radius (px) the glow spreads to, set when a press starts. */
    glowTo: GLASS_GLOW_START,
    frame: 0,
    time: 0,
  })
  const goal = useRef({
    target,
    tracking,
    pressed,
    thin,
    disabled,
    overshoot,
    reduced: false,
    pointer: null as SliderPointer | null,
  })
  const wake = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const media = reducedMotionQuery()
    const state = simulation.current
    let alive = true
    /**
     * The thumb's travel (px) and inset (the edge-to-centre distance at either end), the track's
     * height and direction. Every read of a frame happens here, before paint writes anything.
     */
    const geometry = () => {
      const el = host.current
      if (!el) return { travel: 0, inset: 0, height: 0, rtl: false }
      const style = getComputedStyle(el)
      const height = el.offsetHeight
      const inset = Number.parseFloat(style.getPropertyValue('--lab-slider-inset')) || height / 2
      return { travel: Math.max(0, el.offsetWidth - 2 * inset), inset, height, rtl: style.direction === 'rtl' }
    }
    const paint = (measured = geometry()) => {
      const el = host.current
      if (!el) return
      const g = goal.current
      const position = g.overshoot ? state.position : Math.max(0, Math.min(1, state.position))
      const stretch = state.stretch.position
      el.style.setProperty('--lab-slider-visual-fraction', String(position))
      el.style.setProperty('--lab-slider-press', String(state.press.position))
      el.style.setProperty('--lab-slider-stretch', `${stretch}px`)
      el.style.setProperty('--lab-slider-stretch-size', `${Math.abs(stretch)}px`)
      el.style.setProperty('--lab-lens', String(Math.max(0, Math.min(1, state.lens.position))))
      el.style.setProperty('--lab-lens-glow', String(Math.max(0, Math.min(1, state.glowOpacity.position))))
      el.style.setProperty('--lab-lens-glow-r', `${Math.max(1, state.glowRadius.position)}px`)
      const pointer = g.pointer
      if (pointer) {
        // The glow sits under the pointer: its offset from the drawn thumb's centre.
        const { travel, inset, height, rtl } = measured
        const center = inset + travel * position + stretch / 2
        const dx = (pointer.x - center) * (rtl ? -1 : 1)
        el.style.setProperty('--lab-lens-glow-x', `calc(50% + ${dx}px)`)
        el.style.setProperty('--lab-lens-glow-y', `calc(50% + ${pointer.y - height / 2}px)`)
      }
    }
    const spring = (value: StepSpringState, to: number, dt: number, { stiffness, damping }: { stiffness: number; damping: number }) => {
      const next = stepSpring(value, to, dt, stiffness, damping)
      value.position = next.position
      value.velocity = next.velocity
    }
    const settle = (value: StepSpringState, to: number) => {
      value.position = to
      value.velocity = 0
    }
    const tick = (time: number) => {
      state.frame = 0
      if (!alive) return
      const g = goal.current
      const dt = state.time ? Math.max(1 / 240, Math.min(0.04, (time - state.time) / 1000)) : 1 / 60
      state.time = time
      // Read layout once, before this frame writes anything.
      const measured = geometry()
      if (g.reduced || g.disabled) {
        state.position = g.target
        state.velocity = 0
        settle(state.press, 1)
        settle(state.lens, 0)
        settle(state.stretch, 0)
        settle(state.glowOpacity, 0)
        state.lensing = false
        paint(measured)
        state.time = 0
        return
      }
      const previous = state.position
      if (g.tracking) {
        state.position = g.target
        state.velocity = (g.target - previous) / dt
      } else {
        const next = stepSpring(
          { position: state.position, velocity: state.velocity },
          g.target,
          dt,
          g.thin ? 700 : 420,
          g.thin ? 48 : 28
        )
        state.position = next.position
        state.velocity = next.velocity
      }
      // The lens: in on a press (the glow starts small under the finger and spreads), out on release.
      if (g.pressed && !state.lensing) {
        state.lensing = true
        settle(state.glowRadius, GLASS_GLOW_START)
        settle(state.glowOpacity, 1)
        const thumb = host.current?.querySelector<HTMLElement>(':scope > .lab-slider-thumb')
        state.glowTo = glassGlowRadius(thumb?.offsetWidth ?? 0)
      } else if (!g.pressed) state.lensing = false
      const lensing = state.lensing
      spring(state.press, lensing ? LENS_THUMB_SCALE : 1, dt, lensing ? SNAPPY : BOUNCY)
      spring(state.lens, lensing ? 1 : 0, dt, SNAPPY)
      const stretchTarget = lensing ? lensStretch(state.velocity * measured.travel) : 0
      spring(state.stretch, stretchTarget, dt, lensing ? INTERACTIVE : BOUNCY)
      spring(state.glowRadius, state.glowTo, dt, SMOOTH)
      spring(state.glowOpacity, lensing ? 1 : 0, dt, SMOOTH)
      paint(measured)
      const resting = (value: StepSpringState, to: number, delta: number) =>
        Math.abs(value.position - to) <= delta && Math.abs(value.velocity) <= delta * 10
      const moving =
        Math.abs(state.position - g.target) > 0.0001 ||
        Math.abs(state.velocity) > 0.002 ||
        !resting(state.press, lensing ? LENS_THUMB_SCALE : 1, 0.0005) ||
        !resting(state.lens, lensing ? 1 : 0, 0.002) ||
        !resting(state.stretch, stretchTarget, 0.05) ||
        !resting(state.glowOpacity, lensing ? 1 : 0, 0.005) ||
        (lensing && !resting(state.glowRadius, state.glowTo, 0.5))
      if (moving) state.frame = requestAnimationFrame(tick)
      else {
        state.position = g.target
        state.velocity = 0
        settle(state.press, lensing ? LENS_THUMB_SCALE : 1)
        settle(state.lens, lensing ? 1 : 0)
        settle(state.stretch, 0)
        settle(state.glowOpacity, lensing ? 1 : 0)
        state.time = 0
        paint(measured)
      }
    }
    wake.current = () => {
      if (!state.frame && alive) state.frame = requestAnimationFrame(tick)
    }
    const changed = () => {
      goal.current.reduced = media.matches
      wake.current()
    }
    goal.current.reduced = media.matches
    media.addEventListener('change', changed)
    paint()
    wake.current()
    return () => {
      alive = false
      cancelAnimationFrame(state.frame)
      state.frame = 0
      state.time = 0
      media.removeEventListener('change', changed)
    }
  }, [host])
  useLayoutEffect(() => {
    goal.current = {
      ...goal.current,
      target,
      tracking,
      pressed,
      thin,
      disabled,
      overshoot,
    }
    if (!pressed) goal.current.pointer = null
    wake.current()
  }, [host, target, tracking, pressed, thin, disabled, overshoot])
  return {
    /** Moves the touch glow to the pointer (the control's own px, `x` from its inline start). */
    pointer(point: SliderPointer) {
      goal.current.pointer = point
      wake.current()
    },
  }
}
