/**
 * Pure geometry of a segmented control's moving pill: where a drag puts it, how wide it is on the
 * way, where a release lands and how far the glass lens stretches. Shared with the Flutter twin
 * (`segmented_model.dart`, vectors in `flutter/test/fixtures/segmented.json`).
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
/** The lens stretches by the distance the pointer covers in this many seconds (rubber-banded). */
export declare const SEGMENTED_STRETCH_TIME = 0.1;
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
/** How far (px, signed) the lens stretches along a drag moving at `velocity` px/s. */
export declare function segmentedStretch(velocity: number): number;
//# sourceMappingURL=segmented-model.d.ts.map