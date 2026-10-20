'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { stepSpring } from './spring-core'

/** One spring clock for fill, thumb travel and deformation; never rerenders the owner. */
export function useSliderMotion(
  host: RefObject<HTMLDivElement | null>,
  target: number,
  tracking: boolean,
  pressed: boolean,
  thin: boolean,
  disabled: boolean
) {
  const simulation = useRef({
    position: target,
    velocity: 0,
    shape: 0,
    shapeVelocity: 0,
    frame: 0,
    time: 0,
  })
  const goal = useRef({ target, tracking, pressed, thin, disabled, reduced: false, rtl: false })
  const wake = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const state = simulation.current
    let alive = true
    const paint = (position: number, shape: number, lean: number) => {
      const el = host.current
      if (!el) return
      el.style.setProperty(
        '--lab-slider-visual-fraction',
        String(Math.max(0, Math.min(1, position)))
      )
      el.style.setProperty('--lab-slider-stretch', String(shape))
      el.style.setProperty('--lab-slider-lean', String(lean))
    }
    const tick = (time: number) => {
      state.frame = 0
      if (!alive) return
      const g = goal.current
      const dt = state.time ? Math.max(1 / 240, Math.min(0.04, (time - state.time) / 1000)) : 1 / 60
      state.time = time
      if (g.reduced || g.disabled) {
        state.position = g.target
        state.velocity = 0
        state.shape = 0
        state.shapeVelocity = 0
        paint(g.target, 0, 0)
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
      const speed = Math.abs(state.velocity)
      const shapeTarget =
        (g.pressed ? 0.25 : 0) + (g.thin && !g.pressed ? 0 : Math.min(1, speed * 0.32))
      const shape = stepSpring(
        { position: state.shape, velocity: state.shapeVelocity },
        shapeTarget,
        dt,
        330,
        20
      )
      state.shape = shape.position
      state.shapeVelocity = shape.velocity
      paint(
        state.position,
        Math.max(-0.18, Math.min(1.25, state.shape)),
        Math.max(-1, Math.min(1, state.velocity * 0.2)) * (g.rtl ? -1 : 1)
      )
      const moving =
        Math.abs(state.position - g.target) > 0.0001 ||
        Math.abs(state.velocity) > 0.002 ||
        Math.abs(state.shape - shapeTarget) > 0.001 ||
        Math.abs(state.shapeVelocity) > 0.01
      if (moving) state.frame = requestAnimationFrame(tick)
      else {
        state.position = g.target
        state.velocity = 0
        state.shape = g.pressed ? 0.25 : 0
        state.shapeVelocity = 0
        state.time = 0
        paint(g.target, state.shape, 0)
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
    paint(state.position, 0, 0)
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
      rtl: Boolean(host.current && getComputedStyle(host.current).direction === 'rtl'),
    }
    wake.current()
  }, [host, target, tracking, pressed, thin, disabled])
}
