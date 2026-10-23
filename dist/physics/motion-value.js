import { SPRINGS, solveSpring, springAtRest } from './spring.js';
import { VelocityTracker } from './velocity.js';
const callbacks = new Set();
const measureCallbacks = new Set();
const renderCallbacks = new Set();
let frame = 0;
function runPhase(phase, now) {
    // A callback canceled by an earlier callback must not run from the snapshot. New callbacks
    // in this phase start next frame; callbacks added to a later phase can run this frame.
    for (const callback of [...phase])
        if (phase.has(callback))
            callback(now);
}
function loop(now) {
    frame = callbacks.size || measureCallbacks.size || renderCallbacks.size ? requestAnimationFrame(loop) : 0;
    runPhase(callbacks, now);
    runPhase(measureCallbacks, now);
    runPhase(renderCallbacks, now);
}
function subscribeFrame(phase, callback) {
    phase.add(callback);
    if (!frame && typeof requestAnimationFrame !== 'undefined')
        frame = requestAnimationFrame(loop);
    return () => {
        phase.delete(callback);
    };
}
/** Runs `callback` on every animation frame until the returned function is called. One shared loop. */
export function onAnimationFrame(callback) {
    return subscribeFrame(callbacks, callback);
}
/** Reads layout after all motion updates and before any subscribed render writes, on the shared clock. */
export function onMeasureFrame(callback) {
    return subscribeFrame(measureCallbacks, callback);
}
/** Paints after all motion updates and layout reads, regardless of subscription order, on the shared clock. */
export function onRenderFrame(callback) {
    return subscribeFrame(renderCallbacks, callback);
}
/** True when the reader asked for reduced motion. Safe to call on the server. */
export function prefersReducedMotion() {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
/**
 * One animatable number with a velocity, driven by springs or by a pointer. Subscribers paint it
 * (usually by writing a transform) without re-rendering React. Starting a new animation, tracking
 * a pointer or setting the value interrupts the current animation exactly where it is, keeping
 * its speed, so motion never jumps.
 */
export class MotionValue {
    restDelta;
    value;
    speed = 0;
    solver = null;
    started = 0;
    target = 0;
    stopFrame = null;
    settle = null;
    listeners = new Set();
    tracker = new VelocityTracker();
    tracking = false;
    constructor(initial, 
    /** Distance from the target that counts as arrived, in this value's units. */
    restDelta = 0.001) {
        this.restDelta = restDelta;
        this.value = initial;
    }
    /** Current value. */
    get() {
        return this.value;
    }
    /**
     * Current speed in units per second: the spring's, or the pointer's while tracking. Pass the
     * release event's `timeStamp` as `at` so a busy main thread cannot turn a flick into a stop.
     */
    getVelocity(at = performance.now()) {
        if (this.tracking)
            return this.tracker.velocity(at);
        return this.speed;
    }
    /** True while a spring is running. */
    isAnimating() {
        return this.solver !== null;
    }
    /** The target of the running animation, or the value at rest. */
    getTarget() {
        return this.solver ? this.target : this.value;
    }
    /** Calls `listener` with every new value. Returns an unsubscribe function. */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /** Jumps to `value` and stops: no animation, no velocity. */
    set(value) {
        this.finish(false);
        this.tracking = false;
        this.speed = 0;
        this.write(value);
    }
    /**
     * Follows a pointer: sets `value` immediately and records it for velocity, so a following
     * `animateTo` continues at the pointer's speed. `time` is the event's timestamp in ms.
     */
    track(value, time = performance.now()) {
        this.finish(false);
        if (!this.tracking) {
            this.tracker.reset();
            this.tracking = true;
        }
        this.tracker.add(value, time);
        this.write(value);
    }
    /** Stops a running animation where it is; keeps the current speed for a following animation. */
    stop() {
        if (this.solver) {
            const state = this.solver((performance.now() - this.started) / 1000);
            this.speed = state.velocity;
            this.finish(false);
            this.write(state.position);
            return;
        }
        this.finish(false);
    }
    /**
     * Springs to `target`. Resolves `true` when it comes to rest there, `false` when interrupted by
     * another animation, `set`, `track` or `stop`.
     */
    animateTo(target, options = {}) {
        const spring = typeof options.spring === 'string' ? SPRINGS[options.spring] : options.spring ?? SPRINGS.smooth;
        const now = performance.now();
        const velocity = options.velocity ??
            (this.tracking
                ? this.tracker.velocity(now)
                : this.solver
                    ? this.solver((now - this.started) / 1000).velocity
                    : this.speed);
        if (this.solver)
            this.write(this.solver((now - this.started) / 1000).position);
        this.finish(false);
        this.tracking = false;
        if (options.instant || (Math.abs(this.value - target) <= this.restDelta && Math.abs(velocity) <= this.restDelta * 10)) {
            this.speed = 0;
            this.write(target);
            return Promise.resolve(true);
        }
        this.target = target;
        this.solver = solveSpring(spring, this.value, target, velocity);
        this.started = now;
        return new Promise((resolve) => {
            this.settle = resolve;
            this.stopFrame = onAnimationFrame((time) => {
                if (!this.solver)
                    return;
                const state = this.solver(Math.max(0, (time - this.started) / 1000));
                if (springAtRest(state, target, this.restDelta)) {
                    this.speed = 0;
                    this.solver = null;
                    this.write(target);
                    this.finish(true);
                    return;
                }
                this.speed = state.velocity;
                this.write(state.position);
            });
        });
    }
    write(value) {
        this.value = value;
        for (const listener of [...this.listeners])
            listener(value);
    }
    finish(arrived) {
        this.stopFrame?.();
        this.stopFrame = null;
        this.solver = null;
        const settle = this.settle;
        this.settle = null;
        settle?.(arrived);
    }
}
//# sourceMappingURL=motion-value.js.map