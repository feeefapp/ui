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
//# sourceMappingURL=transitions.d.ts.map