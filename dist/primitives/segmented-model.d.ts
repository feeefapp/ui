/**
 * Pure geometry of a segmented control's moving pill: where a drag puts it, how wide it is on the
 * way and where a release lands (its lens stretch is `lensStretch`, lens-model.ts), and how a control
 * too wide for its space scrolls (edge fades, revealing the selection, auto-scroll while the pill is
 * dragged near an edge). Shared with the
 * Flutter twin (`segmented_model.dart`, vectors in `flutter/test/fixtures/segmented.json`).
 */
/** One segment along the track, in px from the track's left edge (physical, never mirrored). */
export type SegmentSpan = {
    start: number;
    width: number;
    /** Disabled segments are never a release target. */
    disabled?: boolean;
};
/** How far (px) the pill can be pulled past either end, with rubber-band resistance. */
export declare const SEGMENTED_OVERDRAG = 12;
/** Deceleration a release is projected with (`projectMomentum`): quicker than a scroll view (0.99), so
 * a flick reaches the next segment without skipping one. */
export declare const SEGMENTED_DECELERATION = 0.97;
/** Travel (px) before a press becomes a drag: mouse and pen, then touch. */
export declare const SEGMENTED_SLOP: {
    readonly mouse: 4;
    readonly touch: 10;
};
/** Centre of a segment. */
export declare function segmentCenter(span: SegmentSpan): number;
/** Index of the segment under `x`; a point in a gap or past an end goes to the nearest segment. */
export declare function segmentIndexAt(x: number, spans: readonly SegmentSpan[]): number;
/**
 * The pill's centre while dragged: the pointer less where it grabbed the pill, kept between the
 * first and last segment centres (so the pill stays on the track), with a slight rubber band past
 * either end.
 */
export declare function segmentedDragCenter(pointer: number, grab: number, spans: readonly SegmentSpan[]): number;
/** The pill's width with its centre at `center`: it changes from one segment's width to the next. */
export declare function segmentedPillWidth(center: number, spans: readonly SegmentSpan[]): number;
/**
 * Where a released pill settles: the enabled segment nearest to where its momentum would carry it
 * (a quick flick reaches the next segment, a careful drop stays put). -1 when every one is disabled.
 */
export declare function segmentedSnapIndex(center: number, velocity: number, spans: readonly SegmentSpan[]): number;
/** Length (px) of the fade at an edge of a control that scrolls, and the scroll distance over which
 * it fades in (`scrollEdgeOpacities`); a revealed option also stops this far from the edge. */
export declare const SEGMENTED_FADE = 24;
/** How far (px) a scrolling control's clip reaches above and below it, so a pressed pill can swell
 * and cast its shadow without being cut. */
export declare const SEGMENTED_BLEED = 8;
/** Distance (px) from a visible edge inside which a dragged pill scrolls the control. */
export declare const SEGMENTED_AUTOSCROLL_ZONE = 40;
/** Fastest auto-scroll (px/s): the pointer at or past the edge. */
export declare const SEGMENTED_AUTOSCROLL_SPEED = 720;
/**
 * Auto-scroll speed (px/s, physical: positive shows more of the right) for a pill dragged with the
 * pointer at `pointer` in a viewport spanning `viewStart`…`viewEnd`: zero in the middle, easing in
 * (quadratically) inside `SEGMENTED_AUTOSCROLL_ZONE` of either edge (a third of a narrow viewport)
 * up to `SEGMENTED_AUTOSCROLL_SPEED` at the edge and beyond.
 */
export declare function segmentedAutoScrollSpeed(pointer: number, viewStart: number, viewEnd: number): number;
/**
 * The scroll offset (px from the left, physical) that shows the option spanning `start`…`end`
 * (content px) in a `viewport` px wide view scrolled to `offset` of at most `max`, clear of the edge
 * fades by `padding`: the least movement, as `revealScrollChild` does with the control's
 * `scroll-padding`.
 */
export declare function segmentedRevealOffset(offset: number, max: number, viewport: number, start: number, end: number, padding?: number): number;
//# sourceMappingURL=segmented-model.d.ts.map