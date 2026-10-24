/**
 * Pull-to-refresh geometry (pure; the Flutter twin is `scroll/pull_refresh_model.dart`). A pull
 * starts at the top of a scroll area after `slop` px of downward travel, follows the finger with
 * rubber-band resistance, refreshes when released past `threshold`, and holds the content `hold`
 * px open (the loader with 16px above and below) until the refresh completes.
 */
export declare const PULL_REFRESH: {
    /** Visible pull (px) past which a release refreshes. */
    readonly threshold: 64;
    /** Gap (px) the content holds open while refreshing. */
    readonly hold: 52;
    /** Loader size (px). */
    readonly loader: 20;
    /** Finger travel (px) before a pull starts, so taps and jitters never pull. */
    readonly slop: 6;
};
/**
 * Visible pull for `travel` px of finger travel in an area `dimension` px tall: rubber-banded like
 * iOS overscroll. Reduced motion follows the finger at half speed without the rubber band, capped
 * at 1.5 × the threshold.
 */
export declare function pullDistance(travel: number, dimension: number, reduced?: boolean): number;
/** How far toward a refresh the pull is, 0 … 1 (the loader lights a square per ninth). */
export declare function pullProgress(distance: number): number;
/** Where a released pull settles: open at `hold` and refreshing, or closed. */
export declare function pullRelease(distance: number): {
    refresh: boolean;
    target: number;
};
/** Top of the loader below the area's top reservation: centred in the revealed gap. */
export declare function pullLoaderTop(distance: number): number;
//# sourceMappingURL=pull-refresh-model.d.ts.map