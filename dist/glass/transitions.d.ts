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
 * - only a bubble with no other bubble in the container materializes in place or dematerializes;
 * - a bubble with an origin (a menu and the button that opened it) is born out of its origin and
 *   returns into it, whatever else is in the container (`GLASS_ORIGIN`).
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
/**
 * The `source` of a birth and `target` of a death that come from or go to the bubble's origin: the
 * control that opened it (a menu's button), which may be another container's glass or no glass at
 * all. Its rect is `glassOrigin`'s.
 */
export declare const GLASS_ORIGIN = "origin";
/**
 * The springs of a bubble growing out of its origin and returning into it: iOS 26 menus springing
 * out of their button (`SPRINGS.menu`) and flying back into it (`SPRINGS.menuDismiss`, narrowing
 * past it before it lands). Every other change uses the container's `SPRINGS.snappy`.
 */
export declare const GLASS_ORIGIN_SPRINGS: {
    readonly grow: {
        readonly duration: 0.3;
        readonly bounce: 0.27;
    };
    readonly absorb: {
        readonly duration: 0.31;
        readonly bounce: 0.33;
    };
};
/**
 * Side (px) of the droplet a bubble grows out of when its origin is not glass (a plain button in
 * content): a small round drop at the origin's centre, so no glass copy of the button pops in.
 */
export declare const GLASS_ORIGIN_SEED = 8;
/** How far (px) a bubble may reach past its origin on each side and still be the origin's glass. */
export declare const GLASS_ORIGIN_HUG = 12;
/**
 * The rect a bubble is born out of and returns into. `origin` is the control's rect; `glass` the
 * glass bubble around it, or null when it is not glass. A bubble that hugs the control (a button in
 * its own toolbar bubble, within `GLASS_ORIGIN_HUG`) gives its own rect, so the new bubble leaves
 * and rejoins exactly that glass; a wider one (a group of buttons) gives the control's rect; no
 * glass gives a `GLASS_ORIGIN_SEED` droplet at the control's centre, so no glass copy of a plain
 * button pops in.
 */
export declare function glassOrigin(origin: GlassRect, glass: GlassRect | null): GlassRect;
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
 * @param origins the `glassOrigin` rect of bubbles with an origin: they are born out of it and
 *   return into it
 */
export declare function planGlassTransition(previous: ReadonlyMap<string, GlassRect>, next: ReadonlyMap<string, GlassRect>, spacing: number, origins?: ReadonlyMap<string, GlassRect>): GlassPlan;
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