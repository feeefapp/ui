import { SPRINGS, type Spring } from './spring.js';
import type { Motion } from '../theme-config.js';
type FrameCallback = (now: number) => void;
/** Runs `callback` on every animation frame until the returned function is called. One shared loop. */
export declare function onAnimationFrame(callback: FrameCallback): () => void;
/** Reads layout after all motion updates and before any subscribed render writes, on the shared clock. */
export declare function onMeasureFrame(callback: FrameCallback): () => void;
/** Paints after all motion updates and layout reads, regardless of subscription order, on the shared clock. */
export declare function onRenderFrame(callback: FrameCallback): () => void;
/**
 * How much the kit animates right now: the app's ThemeConfig `motion` (`data-lab-motion` on
 * `<html>`), made stricter by the reader's `prefers-reduced-motion` (`full` becomes `reduced`;
 * `none` stays `none`). `full` on the server.
 */
export declare function motionOf(root?: Element | null): Motion;
/**
 * True when motion should be reduced: the reader asked for it, or the app's ThemeConfig `motion`
 * is `reduced` or `none`. Every reduced-motion path in the kit reads this. Safe on the server.
 */
export declare function prefersReducedMotion(): boolean;
/** Calls `listener` whenever `motionOf()` may have changed (the OS setting or `data-lab-motion`). */
export declare function onMotionChange(listener: () => void): () => void;
/**
 * `prefersReducedMotion()` shaped like a `MediaQueryList`, for code written against
 * `matchMedia('(prefers-reduced-motion: reduce)')`: `matches` is live and `change` fires on either source.
 */
export declare function reducedMotionQuery(): {
    readonly matches: boolean;
    addEventListener(type: 'change', listener: () => void): void;
    removeEventListener(type: 'change', listener: () => void): void;
};
export type AnimateOptions = {
    /** A spring, or the name of one of the kit's springs. Default `smooth`. */
    spring?: Spring | keyof typeof SPRINGS;
    /** Starting velocity in units per second. Defaults to the value's current velocity. */
    velocity?: number;
    /** Jump straight to the target (reduced motion, or no reason to animate). */
    instant?: boolean;
};
/**
 * One animatable number with a velocity, driven by springs or by a pointer. Subscribers paint it
 * (usually by writing a transform) without re-rendering React. Starting a new animation, tracking
 * a pointer or setting the value interrupts the current animation exactly where it is, keeping
 * its speed, so motion never jumps.
 */
export declare class MotionValue {
    /** Distance from the target that counts as arrived, in this value's units. */
    private readonly restDelta;
    private value;
    private speed;
    private solver;
    private started;
    private target;
    private stopFrame;
    private settle;
    private listeners;
    private tracker;
    private tracking;
    constructor(initial: number, 
    /** Distance from the target that counts as arrived, in this value's units. */
    restDelta?: number);
    /** Current value. */
    get(): number;
    /**
     * Current speed in units per second: the spring's, or the pointer's while tracking. Pass the
     * release event's `timeStamp` as `at` so a busy main thread cannot turn a flick into a stop.
     */
    getVelocity(at?: number): number;
    /** True while a spring is running. */
    isAnimating(): boolean;
    /** The target of the running animation, or the value at rest. */
    getTarget(): number;
    /** Calls `listener` with every new value. Returns an unsubscribe function. */
    subscribe(listener: (value: number) => void): () => void;
    /** Jumps to `value` and stops: no animation, no velocity. */
    set(value: number): void;
    /**
     * Follows a pointer: sets `value` immediately and records it for velocity, so a following
     * `animateTo` continues at the pointer's speed. `time` is the event's timestamp in ms.
     */
    track(value: number, time?: number): void;
    /** Stops a running animation where it is; keeps the current speed for a following animation. */
    stop(): void;
    /**
     * Springs to `target`. Resolves `true` when it comes to rest there, `false` when interrupted by
     * another animation, `set`, `track` or `stop`.
     */
    animateTo(target: number, options?: AnimateOptions): Promise<boolean>;
    private write;
    private finish;
}
export {};
//# sourceMappingURL=motion-value.d.ts.map