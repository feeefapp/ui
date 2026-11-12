import * as React from 'react';
import { type Spring } from '../physics/spring.js';
import type { Motion } from '../theme-config.js';
/**
 * How centred dialogs (Alert, Modal) come and go, like iOS alerts: they open with a spring from
 * a little larger than their size while fading in, and close with a fade only (no scale on exit).
 * Reduced motion crossfades; `motion: 'none'` is instant. The page's dimming follows the fade.
 */
export declare const POP_MOTION: {
    /** Scale the surface opens from. */
    readonly fromScale: 1.1;
    /** The scale spring (a small overshoot). */
    readonly spring: Spring;
    /** Fade-in length in seconds. */
    readonly fadeIn: 0.2;
    /** Fade-out length in seconds (also the reduced-motion crossfade). */
    readonly fadeOut: 0.2;
    /** The fade's curve, in and out: quick at first and exactly done at its length, with no tail. */
    readonly fadeEasing: "cubic-bezier(0, 0, 0.58, 1)";
};
/** How a sheet's pane presentation slides in and out (the scrim dims on the same timing). */
export declare const SLIDE_MOTION: {
    readonly spring: Spring;
    /** Reduced-motion crossfade length in seconds. */
    readonly fade: 0.2;
};
/** Surface scale at a given open progress (1 = open; past 1 while the spring overshoots). */
export declare function popScale(progress: number): number;
/** One property animated from where it is now to where it rests. */
export type SurfaceTrack = {
    property: 'transform' | 'opacity';
    from: string;
    to: string;
    duration: number;
    easing: string;
};
/**
 * A surface's motion for one open or close: its tracks (transform and opacity only, so the
 * compositor runs them) and the scrim's opacity on the same timing, so the dim moves in step.
 */
export type SurfacePlan = {
    surface: SurfaceTrack[];
    scrim: SurfaceTrack | null;
};
/** Where the surface is when a motion starts, read mid-flight; null when it enters from nothing. */
export type SurfaceNow = {
    opacity: number;
    transform: string;
    scrim: number;
};
type Timing = {
    duration: number;
    easing: string;
};
/** A spring as a CSS easing; browsers without `linear()` get a close cubic curve. */
export declare function springEasing(spring: Spring): Timing;
/**
 * The pop motion (Alert, Modal). Opening from nothing springs the scale from `fromScale` and fades
 * in; opening again while closing fades back from where it is. Closing only fades, ending exactly
 * at `fadeOut`. The scrim always shares the fade's timing.
 */
export declare function popPlan(open: boolean, motion: Motion, now: SurfaceNow | null): SurfacePlan;
/**
 * The slide motion (a sheet's pane): in from `offset` (a transform that puts it off screen) and back out,
 * on one spring, with the scrim on the same timing. Reduced motion crossfades instead.
 */
export declare function slidePlan(open: boolean, motion: Motion, now: SurfaceNow | null, offset: string): SurfacePlan;
/**
 * Runs a presentation surface's motion on the compositor: Web Animations of transform and opacity
 * only, with `will-change` set just while they run, and the scrim on the same timing. Each
 * change of `open` sets the end state inline and animates from wherever the surface is (mid-flight
 * after an interruption), so nothing is left behind at rest. While it moves, the surface carries
 * `data-glass-instant`: the glass inside rides its transform and leaves in the same frames.
 * `onExited` runs once a close has fully ended.
 */
export declare function useSurfaceMotion(open: boolean, surface: React.RefObject<HTMLElement | null>, scrim: React.RefObject<HTMLElement | null>, onExited: () => void, plan: (open: boolean, motion: Motion, now: SurfaceNow | null, element: HTMLElement) => SurfacePlan): void;
/** The pop motion on `surface` (transform, opacity) and `scrim` (opacity). */
export declare function usePopMotion(open: boolean, surface: React.RefObject<HTMLElement | null>, scrim: React.RefObject<HTMLElement | null>, onExited: () => void): void;
export {};
//# sourceMappingURL=motion.d.ts.map