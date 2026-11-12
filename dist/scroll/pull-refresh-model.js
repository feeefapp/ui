import { rubberBand } from '../physics/spring.js';
/**
 * Pull-to-refresh geometry (pure; the Flutter twin is `scroll/pull_refresh_model.dart`). A pull
 * starts at the top of a scroll area after `slop` px of downward travel, follows the finger with
 * rubber-band resistance, refreshes when released past `threshold`, and holds the content `hold`
 * px open (the loader with 16px above and below) until the refresh completes.
 */
export const PULL_REFRESH = {
    /** Visible pull (px) past which a release refreshes. */
    threshold: 64,
    /** Gap (px) the content holds open while refreshing. */
    hold: 52,
    /** Loader size (px). */
    loader: 20,
    /** Finger travel (px) before a pull starts, so taps and jitters never pull. */
    slop: 6,
};
/**
 * Visible pull for `travel` px of finger travel in an area `dimension` px tall: rubber-banded like
 * iOS overscroll. Reduced motion follows the finger at half speed without the rubber band, capped
 * at 1.5 × the threshold.
 */
export function pullDistance(travel, dimension, reduced = false) {
    if (!(travel > 0))
        return 0;
    if (reduced)
        return Math.min(travel / 2, PULL_REFRESH.threshold * 1.5);
    return rubberBand(travel, Math.max(1, dimension));
}
/** How far toward a refresh the pull is, 0 … 1 (the loader lights a square per ninth). */
export function pullProgress(distance) {
    return Math.min(1, Math.max(0, distance / PULL_REFRESH.threshold));
}
/** Where a released pull settles: open at `hold` and refreshing, or closed. */
export function pullRelease(distance) {
    return distance >= PULL_REFRESH.threshold
        ? { refresh: true, target: PULL_REFRESH.hold }
        : { refresh: false, target: 0 };
}
/** Top of the loader below the area's top reservation: centred in the revealed gap. */
export function pullLoaderTop(distance) {
    return Math.max(0, distance) / 2 - PULL_REFRESH.loader / 2;
}
//# sourceMappingURL=pull-refresh-model.js.map