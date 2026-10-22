/**
 * Analytic damped springs, described the way SwiftUI describes them: a perceptual `duration` in
 * seconds and a `bounce` from -1 (very overdamped) through 0 (no overshoot) to 1 (undamped).
 * Being closed-form, a spring knows its exact position and velocity at any time, so an animation
 * can be interrupted or retargeted mid-flight without a jump or a change of speed.
 */
export type LabSpring = {
    /** Perceptual duration in seconds: roughly how long the motion takes to look finished. */
    duration: number;
    /** Overshoot from -1 to 1. 0 settles without overshoot; 0.15 is a snappy hint; 0.3 bounces. */
    bounce: number;
};
/** The kit's named springs. Pick by role, not by look. */
export declare const LAB_SPRINGS: {
    /** Default for layout and presentation: pages, sheets, panels. No overshoot. */
    readonly smooth: {
        readonly duration: 0.5;
        readonly bounce: 0;
    };
    /** Small controls and state changes that should feel quick: toggles, chips, indicators. */
    readonly snappy: {
        readonly duration: 0.35;
        readonly bounce: 0.15;
    };
    /** Playful arrivals that deserve attention, such as a card landing in place. */
    readonly bouncy: {
        readonly duration: 0.5;
        readonly bounce: 0.3;
    };
    /** Something released after a drag: settles fast and keeps the finger's speed. */
    readonly release: {
        readonly duration: 0.42;
        readonly bounce: 0.08;
    };
    /** Following a pointer with a touch of lag, for values that must not jump. */
    readonly interactive: {
        readonly duration: 0.2;
        readonly bounce: 0;
    };
};
export type LabSpringName = keyof typeof LAB_SPRINGS;
/** Physical coefficients (mass 1) for a duration/bounce spring, using SwiftUI's mapping. */
export declare function springCoefficients({ duration, bounce }: LabSpring): {
    stiffness: number;
    damping: number;
};
export type LabSpringState = {
    position: number;
    velocity: number;
};
/**
 * Solves a spring from `from` (moving at `velocity` units per second) toward `to`. The returned
 * function gives the exact state `t` seconds later.
 */
export declare function solveSpring(spring: LabSpring, from: number, to: number, velocity?: number): (t: number) => LabSpringState;
/** True once a spring is close enough to `to` and slow enough to snap and stop. */
export declare function springAtRest(state: LabSpringState, to: number, restDelta: number, restSpeed?: number): boolean;
/**
 * Where a moving value would come to rest if it decelerated like an iOS scroll view
 * (`decelerationRate` 0.998 = normal, 0.99 = fast). Velocity is in units per second. Use it to
 * pick a snap point from a flick: a quick flick travels far, a slow release stays close.
 */
export declare function projectMomentum(position: number, velocity: number, decelerationRate?: number): number;
/**
 * iOS rubber-banding: how far content visibly moves when pulled `overshoot` past its limit inside a
 * `dimension`-sized container. Grows quickly at first, then resists, and never exceeds `dimension`.
 */
export declare function rubberBand(overshoot: number, dimension: number, coefficient?: number): number;
/** Clamps `value` to [min, max], letting it stretch past either end with rubber-band resistance. */
export declare function rubberBandClamp(value: number, min: number, max: number, dimension: number, coefficient?: number): number;
/** The target closest to `value` (e.g. a projected position). */
export declare function nearestTarget(value: number, targets: readonly number[]): number;
/** Linear interpolation; `progress` is not clamped, so springs may overshoot through it. */
export declare function mix(from: number, to: number, progress: number): number;
/** Maps `value` from [inMin, inMax] onto [0, 1], clamped. */
export declare function progressBetween(value: number, inMin: number, inMax: number): number;
/**
 * A spring as a CSS transition: `duration` in ms until it settles and a `linear()` easing that
 * traces it (overshoot included). For state changes that CSS animates, like a tab bar collapsing.
 */
export declare function springTiming(spring: LabSpring, samples?: number): {
    duration: number;
    easing: string;
};
//# sourceMappingURL=spring.d.ts.map