/**
 * Analytic damped springs, described the way SwiftUI describes them: a perceptual `duration` in
 * seconds and a `bounce` from -1 (very overdamped) through 0 (no overshoot) to 1 (undamped).
 * Being closed-form, a spring knows its exact position and velocity at any time, so an animation
 * can be interrupted or retargeted mid-flight without a jump or a change of speed.
 */
export type LabSpring = {
  /** Perceptual duration in seconds: roughly how long the motion takes to look finished. */
  duration: number
  /** Overshoot from -1 to 1. 0 settles without overshoot; 0.15 is a snappy hint; 0.3 bounces. */
  bounce: number
}

/** The kit's named springs. Pick by role, not by look. */
export const LAB_SPRINGS = {
  /** Default for layout and presentation: pages, sheets, panels. No overshoot. */
  smooth: { duration: 0.5, bounce: 0 },
  /** Small controls and state changes that should feel quick: toggles, chips, indicators. */
  snappy: { duration: 0.35, bounce: 0.15 },
  /** Playful arrivals that deserve attention, such as a card landing in place. */
  bouncy: { duration: 0.5, bounce: 0.3 },
  /** Something released after a drag: settles fast and keeps the finger's speed. */
  release: { duration: 0.42, bounce: 0.08 },
  /** Following a pointer with a touch of lag, for values that must not jump. */
  interactive: { duration: 0.2, bounce: 0 },
} as const satisfies Record<string, LabSpring>

export type LabSpringName = keyof typeof LAB_SPRINGS

/** Physical coefficients (mass 1) for a duration/bounce spring, using SwiftUI's mapping. */
export function springCoefficients({ duration, bounce }: LabSpring) {
  const d = Math.max(0.01, duration)
  const b = Math.max(-0.99, Math.min(0.99, bounce))
  const stiffness = ((2 * Math.PI) / d) ** 2
  const damping = b >= 0 ? (4 * Math.PI * (1 - b)) / d : (4 * Math.PI) / (d * (1 + b))
  return { stiffness, damping }
}

export type LabSpringState = { position: number; velocity: number }

/**
 * Solves a spring from `from` (moving at `velocity` units per second) toward `to`. The returned
 * function gives the exact state `t` seconds later.
 */
export function solveSpring(
  spring: LabSpring,
  from: number,
  to: number,
  velocity = 0
): (t: number) => LabSpringState {
  const { stiffness, damping } = springCoefficients(spring)
  const omega = Math.sqrt(stiffness)
  const zeta = damping / (2 * omega)
  const x0 = from - to
  const v0 = velocity
  if (Math.abs(zeta - 1) < 1e-6) {
    const b = v0 + omega * x0
    return (t) => {
      const e = Math.exp(-omega * t)
      return { position: to + e * (x0 + b * t), velocity: e * (b - omega * (x0 + b * t)) }
    }
  }
  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta)
    const b = (v0 + zeta * omega * x0) / wd
    return (t) => {
      const e = Math.exp(-zeta * omega * t)
      const cos = Math.cos(wd * t),
        sin = Math.sin(wd * t)
      return {
        position: to + e * (x0 * cos + b * sin),
        velocity: e * (-zeta * omega * (x0 * cos + b * sin) + wd * (b * cos - x0 * sin)),
      }
    }
  }
  const s = omega * Math.sqrt(zeta * zeta - 1)
  const r1 = -zeta * omega + s,
    r2 = -zeta * omega - s
  const c2 = (v0 - r1 * x0) / (r2 - r1),
    c1 = x0 - c2
  return (t) => {
    const e1 = Math.exp(r1 * t),
      e2 = Math.exp(r2 * t)
    return { position: to + c1 * e1 + c2 * e2, velocity: c1 * r1 * e1 + c2 * r2 * e2 }
  }
}

/** True once a spring is close enough to `to` and slow enough to snap and stop. */
export function springAtRest(state: LabSpringState, to: number, restDelta: number, restSpeed = restDelta * 10) {
  return Math.abs(state.position - to) <= restDelta && Math.abs(state.velocity) <= restSpeed
}

/**
 * Where a moving value would come to rest if it decelerated like an iOS scroll view
 * (`decelerationRate` 0.998 = normal, 0.99 = fast). Velocity is in units per second. Use it to
 * pick a snap point from a flick: a quick flick travels far, a slow release stays close.
 */
export function projectMomentum(position: number, velocity: number, decelerationRate = 0.998) {
  return position + ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * iOS rubber-banding: how far content visibly moves when pulled `overshoot` past its limit inside a
 * `dimension`-sized container. Grows quickly at first, then resists, and never exceeds `dimension`.
 */
export function rubberBand(overshoot: number, dimension: number, coefficient = 0.55) {
  if (!overshoot || dimension <= 0) return 0
  const pulled = (1 - 1 / ((Math.abs(overshoot) * coefficient) / dimension + 1)) * dimension
  return Math.sign(overshoot) * pulled
}

/** Clamps `value` to [min, max], letting it stretch past either end with rubber-band resistance. */
export function rubberBandClamp(value: number, min: number, max: number, dimension: number, coefficient = 0.55) {
  if (value < min) return min + rubberBand(value - min, dimension, coefficient)
  if (value > max) return max + rubberBand(value - max, dimension, coefficient)
  return value
}

/** The target closest to `value` (e.g. a projected position). */
export function nearestTarget(value: number, targets: readonly number[]) {
  let best = targets[0] ?? value
  for (const target of targets) if (Math.abs(target - value) < Math.abs(best - value)) best = target
  return best
}

/** Linear interpolation; `progress` is not clamped, so springs may overshoot through it. */
export function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

/** Maps `value` from [inMin, inMax] onto [0, 1], clamped. */
export function progressBetween(value: number, inMin: number, inMax: number) {
  if (inMax === inMin) return value >= inMax ? 1 : 0
  return Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)))
}

/**
 * A spring as a CSS transition: `duration` in ms until it settles and a `linear()` easing that
 * traces it (overshoot included). For state changes that CSS animates, like a tab bar collapsing.
 */
export function springTiming(spring: LabSpring, samples = 40) {
  const at = solveSpring(spring, 0, 1)
  let end = 0.1
  while (end < 2 && !springAtRest(at(end), 1, 0.001)) end += 0.02
  const points: string[] = []
  for (let i = 0; i <= samples; i++) points.push(String(Math.round(at((i / samples) * end).position * 1000) / 1000))
  points[points.length - 1] = '1'
  return { duration: Math.round(end * 1000), easing: `linear(${points.join(', ')})` }
}
