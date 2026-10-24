import type { GlassRect } from './geometry.js';
/** No glass side is ever longer than this (px): longer is a broken layout, never a bubble. */
export declare const GLASS_MAX_SIDE = 8192;
/** A bubble may span at most this many times the larger side of its container or the viewport. */
export declare const GLASS_MAX_SPAN = 4;
type Size = {
    width: number;
    height: number;
};
/**
 * The rect a member's glass may use, in container pixels, or null when the member is not drawable
 * glass: non-finite or empty, longer than `GLASS_MAX_SIDE`, or longer than `GLASS_MAX_SPAN` times
 * the larger side of the container or viewport (an error box overflowing by 200,000 px). The rest
 * is clamped to the container grown by `margin` or the viewport's longer side, whichever is more
 * (a bubble scrolled partly out of its row keeps its true shape), so no outline, lens map,
 * reflection or shadow is ever built from an unclamped size.
 */
export declare function glassMemberRect(rect: GlassRect, container: Size, viewport: Size, margin: number): GlassRect | null;
export {};
//# sourceMappingURL=member-bounds.d.ts.map