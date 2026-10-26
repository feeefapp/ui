/**
 * A height a sheet can rest at: `medium` (half the screen), `large` (almost full), `fit` (its
 * content, up to large), a pixel height, or a percentage of the screen like `'35%'`.
 */
export type SheetDetent = 'medium' | 'large' | 'fit' | number | `${number}%`;
export type SheetMetrics = {
    /** Height of the area the sheet covers (the viewport, or the container). */
    hostHeight: number;
    /** Gap kept above a large sheet (safe area + breathing room). */
    topInset: number;
    /** The sheet's natural content height, for `fit`. */
    natural: number;
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
/** Scrim strength 0–1: full at or above the lowest detent, fading as the sheet leaves. */
export declare function sheetDim(visible: number, heights: readonly number[]): number;
/**
 * How far the page behind should recede (0–1): only as the sheet rises from below `large`
 * toward full height, like an iOS page sheet stacking over its presenter.
 */
export declare function sheetRecede(visible: number, large: number): number;
//# sourceMappingURL=sheet-model.d.ts.map