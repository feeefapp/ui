export type LabSwipeSides = {
    /** Width revealed by the start-side actions (0 = none). */
    leading: number;
    /** Width revealed by the end-side actions (0 = none). */
    trailing: number;
    /** The row's width. */
    row: number;
    /** Whether a long swipe runs the first action on that side. */
    fullLeading: boolean;
    fullTrailing: boolean;
};
/** Fraction of the row past which a swipe runs the first action. */
export declare const LAB_FULL_SWIPE = 0.55;
/**
 * Where a released row goes. `offset` is logical: positive moves the row toward the end and shows
 * leading actions; negative shows trailing ones. Velocity is in the same units per second.
 */
export declare function swipeRelease(offset: number, velocity: number, s: LabSwipeSides): {
    offset: number;
    commit: 'leading' | 'trailing' | null;
};
/** Whether a row dragged to `offset` is in full-swipe territory (the first action takes over). */
export declare function swipeIsFull(offset: number, s: LabSwipeSides): boolean;
/**
 * The index a dragged item would drop at. `heights` are the items' heights in order, `from` the
 * dragged item's index and `delta` how far it has moved (px, down positive). An item moves aside
 * once the dragged item's center passes its center.
 */
export declare function reorderTarget(heights: readonly number[], from: number, delta: number): number;
/** How far each item shifts to open the gap at `to` while item `from` is dragged. */
export declare function reorderShifts(heights: readonly number[], from: number, to: number): number[];
/** Where the dragged item lands relative to its start, once it drops at `to`. */
export declare function reorderLanding(heights: readonly number[], from: number, to: number): number;
//# sourceMappingURL=list-model.d.ts.map