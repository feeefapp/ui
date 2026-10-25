import { type GlassRect } from './geometry.js';
/**
 * How bubbles change when the layout changes, following Apple's glass rules: inside one container
 * the glass is one material, so a bubble is never born or lost on its own while another is there.
 * - a new bubble within `spacing` of a bubble that just left grows out of it (one bubble splitting
 *   into several, or a replacement);
 * - otherwise a new bubble is born out of its nearest neighbour, preferring one in the same row: a
 *   droplet at the neighbour's facing edge (`glassSeed`) that stretches out to its place;
 * - a leaving bubble is absorbed into the new bubble it overlaps (several merging into one), else
 *   into its nearest neighbour, preferring the same row, shrinking into that neighbour's facing edge;
 * - only a bubble with no other bubble in the container materializes in place or dematerializes.
 */
export type GlassBirth = 
/** Start at `from` (the source bubble's rect, or a droplet at its facing edge) and spring to the target. */
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
/** Keep drawing the leaving bubble while it springs into `into` (the bubble it merges into, or a
 * droplet at that bubble's facing edge), then drop it. */
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
/** True when `a` and `b` share some height: bubbles of one row. */
export declare function sameGlassRow(a: GlassRect, b: GlassRect): boolean;
/**
 * The droplet a bubble is born from, or absorbed into, at `anchor`'s end facing `toward`: a round
 * drop as tall (stacked: as wide) as the smaller of the two, tucked inside that end so it is hidden
 * in the anchor's glass. A new bubble stretches out of its neighbour from there instead of sliding
 * out from under it, and a leaving one shrinks back into it without a trace.
 */
export declare function glassSeed(anchor: GlassRect, toward: GlassRect): GlassRect;
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
/**
 * Fired (bubbling) on an element that stops moving as one piece. A transform on an ancestor of a
 * container never reaches its observers, so the glass inside measures its resting layout now.
 */
export declare const GLASS_SETTLED_EVENT = "lab-glass-settled";
/** Ends an element's `GLASS_INSTANT_ATTRIBUTE` ride and has the glass inside it measure again. */
export declare function settleGlass(element: HTMLElement): void;
/**
 * Put this attribute on content that animates its own size inside a bubble (a segmented control
 * folding into its menu): while it is there, the glass of every bubble in that container follows
 * the layout exactly instead of springing after it (like `glassMotion="follow"`), so the content
 * never pokes out of its glass and the neighbours it pushes never overlap it.
 */
export declare const GLASS_FOLLOW_ATTRIBUTE = "data-glass-follow";
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