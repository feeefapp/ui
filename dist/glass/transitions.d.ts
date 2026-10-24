import { type GlassRect } from './geometry.js';
/**
 * How bubbles change when the layout changes, following Apple's glass rules:
 * - a new bubble within `spacing` of a bubble that just left (or of a living one) grows out of it
 *   (one bubble splitting into several);
 * - a bubble that leaves within `spacing` of a new or living bubble is absorbed into it (several
 *   bubbles merging into one);
 * - anything farther away materializes in place or dematerializes where it was.
 */
export type GlassBirth = 
/** Start at `from` (the source bubble's current rect) and spring to the target. */
{
    id: string;
    kind: 'grow';
    source: string;
    from: GlassRect;
}
/** Start as a point at the target's centre and spring open. */
 | {
    id: string;
    kind: 'materialize';
};
export type GlassDeath = 
/** Keep drawing the leaving bubble while it springs into `into`, then drop it. */
{
    id: string;
    kind: 'absorb';
    target: string;
    into: GlassRect;
}
/** Shrink to a point and drop it. */
 | {
    id: string;
    kind: 'dematerialize';
};
export type GlassPlan = {
    births: GlassBirth[];
    deaths: GlassDeath[];
};
/**
 * Plans births and deaths between two measurements.
 * @param previous current visual rects of bubbles drawn before the change (including ones leaving)
 * @param next target rects of the bubbles present after the change
 */
export declare function planGlassTransition(previous: ReadonlyMap<string, GlassRect>, next: ReadonlyMap<string, GlassRect>, spacing: number): GlassPlan;
/** True when `a` and `b` describe the same rect within half a pixel. */
export declare function sameRect(a: GlassRect, b: GlassRect): boolean;
/**
 * Mark an element with this attribute while it moves as one piece (a presentation surface entering
 * or leaving): the glass inside it takes every layout change at once, with no births, deaths or
 * springs, so it rides the element's transform and leaves with it in the same frames.
 */
export declare const GLASS_INSTANT_ATTRIBUTE = "data-glass-instant";
/** For this long (ms) after glass first appears, its bubbles appear in place (lazy content). */
export declare const GLASS_SETTLE_MS = 300;
/**
 * Whether a layout change applies at once instead of springing: with reduced motion, inside an
 * element marked `GLASS_INSTANT_ATTRIBUTE`, before the container has ever been rendered
 * (`shownAt` null: glass measured inside a closed dialog or a hidden panel must not grow in once
 * shown), and for `GLASS_SETTLE_MS` after it first was.
 */
export declare function glassChangesAtOnce(options: {
    reduceMotion: boolean;
    instant: boolean;
    shownAt: number | null;
    now: number;
}): boolean;
//# sourceMappingURL=transitions.d.ts.map