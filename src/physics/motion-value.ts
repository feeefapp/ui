import { SPRINGS, solveSpring, springAtRest, type Spring, type SpringState } from './spring'
import { VelocityTracker } from './velocity'
import type { Motion } from '../theme-config'

type FrameCallback = (now: number) => void
const callbacks = new Set<FrameCallback>()
const measureCallbacks = new Set<FrameCallback>()
const renderCallbacks = new Set<FrameCallback>()
let frame = 0
function runPhase(phase: Set<FrameCallback>, now: number) {
  // A callback canceled by an earlier callback must not run from the snapshot. New callbacks
  // in this phase start next frame; callbacks added to a later phase can run this frame.
  for (const callback of [...phase]) if (phase.has(callback)) callback(now)
}
function loop(now: number) {
  frame = callbacks.size || measureCallbacks.size || renderCallbacks.size ? requestAnimationFrame(loop) : 0
  runPhase(callbacks, now)
  runPhase(measureCallbacks, now)
  runPhase(renderCallbacks, now)
}
function subscribeFrame(phase: Set<FrameCallback>, callback: FrameCallback) {
  phase.add(callback)
  if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(loop)
  return () => {
    phase.delete(callback)
  }
}
/** Runs `callback` on every animation frame until the returned function is called. One shared loop. */
export function onAnimationFrame(callback: FrameCallback) {
  return subscribeFrame(callbacks, callback)
}
/** Reads layout after all motion updates and before any subscribed render writes, on the shared clock. */
export function onMeasureFrame(callback: FrameCallback) {
  return subscribeFrame(measureCallbacks, callback)
}
/** Paints after all motion updates and layout reads, regardless of subscription order, on the shared clock. */
export function onRenderFrame(callback: FrameCallback) {
  return subscribeFrame(renderCallbacks, callback)
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
let reducedMedia: MediaQueryList | null | undefined
const osReducedMedia = () =>
  reducedMedia === undefined ? (reducedMedia = typeof window === 'undefined' ? null : (window.matchMedia?.(REDUCED_QUERY) ?? null)) : reducedMedia

/**
 * How much the kit animates right now: the app's ThemeConfig `motion` (`data-lab-motion` on
 * `<html>`), made stricter by the reader's `prefers-reduced-motion` (`full` becomes `reduced`;
 * `none` stays `none`). `full` on the server.
 */
export function motionOf(root?: Element | null): Motion {
  if (typeof document === 'undefined') return 'full'
  const config = (root ?? document.documentElement).getAttribute('data-lab-motion')
  if (config === 'none') return 'none'
  return config === 'reduced' || osReducedMedia()?.matches ? 'reduced' : 'full'
}

/**
 * True when motion should be reduced: the reader asked for it, or the app's ThemeConfig `motion`
 * is `reduced` or `none`. Every reduced-motion path in the kit reads this. Safe on the server.
 */
export function prefersReducedMotion() {
  return motionOf() !== 'full'
}

/** Calls `listener` whenever `motionOf()` may have changed (the OS setting or `data-lab-motion`). */
export function onMotionChange(listener: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const media = osReducedMedia()
  media?.addEventListener('change', listener)
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(listener)
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lab-motion'] })
  return () => {
    media?.removeEventListener('change', listener)
    observer?.disconnect()
  }
}

/**
 * `prefersReducedMotion()` shaped like a `MediaQueryList`, for code written against
 * `matchMedia('(prefers-reduced-motion: reduce)')`: `matches` is live and `change` fires on either source.
 */
export function reducedMotionQuery(): {
  readonly matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
} {
  const subscriptions = new Map<() => void, () => void>()
  return {
    get matches() {
      return prefersReducedMotion()
    },
    addEventListener(_type, listener) {
      if (!subscriptions.has(listener)) subscriptions.set(listener, onMotionChange(listener))
    },
    removeEventListener(_type, listener) {
      subscriptions.get(listener)?.()
      subscriptions.delete(listener)
    },
  }
}

export type AnimateOptions = {
  /** A spring, or the name of one of the kit's springs. Default `smooth`. */
  spring?: Spring | keyof typeof SPRINGS
  /** Starting velocity in units per second. Defaults to the value's current velocity. */
  velocity?: number
  /** Jump straight to the target (reduced motion, or no reason to animate). */
  instant?: boolean
}

/**
 * One animatable number with a velocity, driven by springs or by a pointer. Subscribers paint it
 * (usually by writing a transform) without re-rendering React. Starting a new animation, tracking
 * a pointer or setting the value interrupts the current animation exactly where it is, keeping
 * its speed, so motion never jumps.
 */
export class MotionValue {
  private value: number
  private speed = 0
  private solver: ((t: number) => SpringState) | null = null
  private started = 0
  private target = 0
  private stopFrame: (() => void) | null = null
  private settle: ((finished: boolean) => void) | null = null
  private listeners = new Set<(value: number) => void>()
  private tracker = new VelocityTracker()
  private tracking = false

  constructor(
    initial: number,
    /** Distance from the target that counts as arrived, in this value's units. */
    private readonly restDelta = 0.001
  ) {
    this.value = initial
  }

  /** Current value. */
  get() {
    return this.value
  }
  /**
   * Current speed in units per second: the spring's, or the pointer's while tracking. Pass the
   * release event's `timeStamp` as `at` so a busy main thread cannot turn a flick into a stop.
   */
  getVelocity(at = performance.now()) {
    if (this.tracking) return this.tracker.velocity(at)
    return this.speed
  }
  /** True while a spring is running. */
  isAnimating() {
    return this.solver !== null
  }
  /** The target of the running animation, or the value at rest. */
  getTarget() {
    return this.solver ? this.target : this.value
  }

  /** Calls `listener` with every new value. Returns an unsubscribe function. */
  subscribe(listener: (value: number) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Jumps to `value` and stops: no animation, no velocity. */
  set(value: number) {
    this.finish(false)
    this.tracking = false
    this.speed = 0
    this.write(value)
  }

  /**
   * Follows a pointer: sets `value` immediately and records it for velocity, so a following
   * `animateTo` continues at the pointer's speed. `time` is the event's timestamp in ms.
   */
  track(value: number, time = performance.now()) {
    this.finish(false)
    if (!this.tracking) {
      this.tracker.reset()
      this.tracking = true
    }
    this.tracker.add(value, time)
    this.write(value)
  }

  /** Stops a running animation where it is; keeps the current speed for a following animation. */
  stop() {
    if (this.solver) {
      const state = this.solver((performance.now() - this.started) / 1000)
      this.speed = state.velocity
      this.finish(false)
      this.write(state.position)
      return
    }
    this.finish(false)
  }

  /**
   * Springs to `target`. Resolves `true` when it comes to rest there, `false` when interrupted by
   * another animation, `set`, `track` or `stop`.
   */
  animateTo(target: number, options: AnimateOptions = {}): Promise<boolean> {
    const spring =
      typeof options.spring === 'string' ? SPRINGS[options.spring] : options.spring ?? SPRINGS.smooth
    const now = performance.now()
    const velocity =
      options.velocity ??
      (this.tracking
        ? this.tracker.velocity(now)
        : this.solver
          ? this.solver((now - this.started) / 1000).velocity
          : this.speed)
    if (this.solver) this.write(this.solver((now - this.started) / 1000).position)
    this.finish(false)
    this.tracking = false
    if (options.instant || (Math.abs(this.value - target) <= this.restDelta && Math.abs(velocity) <= this.restDelta * 10)) {
      this.speed = 0
      this.write(target)
      return Promise.resolve(true)
    }
    this.target = target
    this.solver = solveSpring(spring, this.value, target, velocity)
    this.started = now
    return new Promise<boolean>((resolve) => {
      this.settle = resolve
      this.stopFrame = onAnimationFrame((time) => {
        if (!this.solver) return
        const state = this.solver(Math.max(0, (time - this.started) / 1000))
        if (springAtRest(state, target, this.restDelta)) {
          this.speed = 0
          this.solver = null
          this.write(target)
          this.finish(true)
          return
        }
        this.speed = state.velocity
        this.write(state.position)
      })
    })
  }

  private write(value: number) {
    this.value = value
    for (const listener of [...this.listeners]) listener(value)
  }

  private finish(arrived: boolean) {
    this.stopFrame?.()
    this.stopFrame = null
    this.solver = null
    const settle = this.settle
    this.settle = null
    settle?.(arrived)
  }
}
