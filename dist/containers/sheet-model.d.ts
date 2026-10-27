/**
 * A height a sheet can rest at: `peek` (just its header, like the Maps search bar), `medium` (half
 * the screen), `large` (almost full), `fit` (its content, up to large), a pixel height, or a
 * percentage of the screen like `'35%'`.
 */
export type SheetDetent = 'peek' | 'medium' | 'large' | 'fit' | number | `${number}%`;
export type SheetMetrics = {
    /** Height of the area the sheet covers (the viewport, or the container). */
    hostHeight: number;
    /** Gap kept above a large sheet (safe area + breathing room). */
    topInset: number;
    /** The sheet's natural content height, for `fit`. */
    natural: number;
    /** The grabber plus the floating header and its gaps, for `peek`. */
    peek?: number;
};
/** Pixel height of one detent, clamped to [0, large]. */
export declare function detentHeight(detent: SheetDetent, m: SheetMetrics): number;
/** Every detent's height, in the order given. */
export declare function detentHeights(detents: readonly SheetDetent[], m: SheetMetrics): number[];
/**
 * The visible height while a finger drags the sheet: 1:1 between its lowest and highest rest
 * heights, rubber-banded above the highest, and below the lowest either free (dismissible, down
 * to 0) or rubber-banded.
 */
export declare function dragHeight(raw: number, heights: readonly number[], hostHeight: number, dismissible: boolean): number;
/**
 * Where a released sheet goes. `velocity` is upward speed in px/s (positive = growing). The
 * height is projected with the flick's momentum and snapped to the nearest detent, or to 0
 * (dismiss) when that is nearer and the sheet is dismissible.
 */
export declare function releaseTarget(visible: number, velocity: number, heights: readonly number[], dismissible: boolean): {
    height: number;
    index: number;
    dismiss: boolean;
};
/**
 * Scrim strength 0–1. Without `undimmed`: full at or above the lowest detent, fading as the sheet
 * leaves. With `undimmed` (the height up to which the page stays usable, iOS
 * `presentationBackgroundInteraction(.enabled(upThrough:))`): none up to it, rising to full at the
 * next detent above it (or at `large` when there is none).
 */
export declare function sheetDim(visible: number, heights: readonly number[], undimmed?: number | null, large?: number): number;
/**
 * How far the page behind should recede (0–1): only as the sheet rises from below `large`
 * toward full height, like an iOS page sheet stacking over its presenter.
 */
export declare function sheetRecede(visible: number, large: number): number;
/** How the sheet's surface is drawn at one height. */
export type SheetFrame = {
    /** 0 at the lowest partial height, 1 at full height (attached). */
    expansion: number;
    /** Gap in px between the surface and the side and bottom edges. */
    gap: number;
    /** Radius in px of the bottom corners (the top corners keep the sheet radius). */
    bottomRadius: number;
    /** Opacity 0–1 of the opaque surface over the glass. */
    solid: number;
};
export type SheetFrameOptions = {
    /** Rest heights. */
    heights: readonly number[];
    /** Full height (the `large` detent's height, attached to the edges). */
    large: number;
    /** Gap of a floating sheet in px. */
    inset: number;
    /** The sheet's corner radius in px. */
    radius: number;
    /**
     * `float` (a phone sheet with a partial detent): inset on glass, reaching the edges and turning
     * opaque as it rises to `large`. `attached`: always edge to edge and opaque (a sheet with only
     * full-height detents, as on iOS). `card` (iPad Maps): always floating glass.
     */
    mode: 'float' | 'attached' | 'card';
};
/**
 * The surface at `visible` height. Floating: full gap and glass up to the lowest partial detent,
 * then the gap closes and the bottom corners square off along a smoothstep as the sheet rises to
 * full height (so a medium detent sits closer to the edges, as in Maps), while the opaque surface
 * fades in over the last stretch, reaching the edges exactly when it is fully opaque.
 */
export declare function sheetFrame(visible: number, o: SheetFrameOptions): SheetFrame;
/** A rectangle in host pixels. */
export type SheetRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** One frame of the morph out of (or back into) the control that opened the sheet. */
export type SheetMorphFrame = {
    /** Panel transform: moves the clip window over the source at p = 0. */
    transform: string;
    /** Panel clip-path: the source's size at p = 0, the whole panel at p = 1. */
    clip: string;
    /** Opacity of the sheet's content. */
    content: number;
};
/**
 * The sheet growing out of the button that opened it (iOS 26 `matchedTransitionSource`): at
 * `p` = 0 the panel is clipped to the source's size, its top centred on the source; at 1 it is
 * the panel at rest. Corners go from the source's radius to the sheet's. `panel` and `source` are
 * in the same pixels; the clip window grows from the panel's top centre, so the header arrives
 * first, and the content fades in as it arrives.
 */
export declare function sheetMorphFrame(p: number, panel: SheetRect, source: SheetRect, sourceRadius: number, radius: number): SheetMorphFrame;
/** The detent a text field focused at `index` should raise the sheet to, or null to stay. */
export declare function focusRaise(detents: readonly SheetDetent[], heights: readonly number[], index: number, focusDetent: SheetDetent | null | undefined): number | null;
/**
 * Where a released free sheet (`snap={false}`) comes to rest: the flick's momentum projected and
 * kept between the lowest and highest detents, or dismissed when it is flung below half the lowest
 * one and the sheet is dismissible.
 */
export declare function freeTarget(visible: number, velocity: number, heights: readonly number[], dismissible: boolean): {
    height: number;
    dismiss: boolean;
};
/** The nearest detent index to a free height. */
export declare function nearestDetent(height: number, heights: readonly number[]): number;
/** One gesture over a resizable sheet's content: the sheet's unclamped height and the scroll. */
export type SheetScrollState = {
    raw: number;
    scroll: number;
};
/**
 * Splits one finger movement over the content between the sheet and its scroll, like iOS sheets
 * and Flutter's DraggableScrollableSheet. `delta` > 0 moves the content up (finger up): the sheet
 * grows to `max` first, then the content scrolls to `scrollMax` and stops there; content that does
 * not scroll lets the sheet stretch past `max`. `delta` < 0 undoes that in reverse: the stretch, then the scroll back to the top, then the
 * sheet shrinks (below its lowest detent the caller's `dragHeight` applies). `raw` is the height
 * before rubber-banding.
 */
export declare function sheetScrollStep(state: SheetScrollState, delta: number, max: number, scrollMax: number): SheetScrollState;
/** iOS UIScrollView's normal deceleration per ms, for content flung inside a sheet. */
export declare const SCROLL_DECELERATION = 0.998;
/**
 * One step of a content fling: `velocity` (px/s, positive = content moving up / scroll growing)
 * decays by `rate` per ms. Returns the scroll after `ms` and the velocity left.
 */
export declare function flingStep(scroll: number, velocity: number, ms: number, rate?: number): {
    scroll: number;
    velocity: number;
};
//# sourceMappingURL=sheet-model.d.ts.map