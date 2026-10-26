/** Pure geometry for Sheet: detent heights, where a release lands, and the dimming. */
import { nearestTarget, projectMomentum, rubberBand } from '../physics/spring.js';
/** Pixel height of one detent, clamped to [0, large]. */
export function detentHeight(detent, m) {
    const large = Math.max(0, m.hostHeight - m.topInset);
    const value = detent === 'large'
        ? large
        : detent === 'medium'
            ? m.hostHeight * 0.5
            : detent === 'fit'
                ? m.natural
                : typeof detent === 'number'
                    ? detent
                    : (parseFloat(detent) / 100) * m.hostHeight;
    return Math.round(Math.max(0, Math.min(large, value)));
}
/** Every detent's height, in the order given. */
export function detentHeights(detents, m) {
    return detents.map((d) => detentHeight(d, m));
}
/**
 * The visible height while a finger drags the sheet: 1:1 between its lowest and highest rest
 * heights, rubber-banded above the highest, and below the lowest either free (dismissible, down
 * to 0) or rubber-banded.
 */
export function dragHeight(raw, heights, hostHeight, dismissible) {
    const min = Math.min(...heights), max = Math.max(...heights);
    if (raw > max)
        return max + rubberBand(raw - max, hostHeight);
    if (raw < min)
        return dismissible ? Math.max(0, raw) : min + rubberBand(raw - min, hostHeight);
    return raw;
}
/**
 * Where a released sheet goes. `velocity` is upward speed in px/s (positive = growing). The
 * height is projected with the flick's momentum and snapped to the nearest detent, or to 0
 * (dismiss) when that is nearer and the sheet is dismissible.
 */
export function releaseTarget(visible, velocity, heights, dismissible) {
    const projected = projectMomentum(visible, velocity, 0.99);
    const targets = dismissible ? [0, ...heights] : [...heights];
    const height = nearestTarget(projected, targets);
    if (dismissible && height === 0)
        return { height: 0, index: -1, dismiss: true };
    return { height, index: heights.indexOf(height), dismiss: false };
}
/** Scrim strength 0–1: full at or above the lowest detent, fading as the sheet leaves. */
export function sheetDim(visible, heights) {
    const min = Math.max(1, Math.min(...heights));
    return Math.max(0, Math.min(1, visible / min));
}
/**
 * How far the page behind should recede (0–1): only as the sheet rises from below `large`
 * toward full height, like an iOS page sheet stacking over its presenter.
 */
export function sheetRecede(visible, large) {
    const start = large * 0.72;
    if (large <= 0 || visible <= start)
        return 0;
    return Math.max(0, Math.min(1, (visible - start) / (large - start)));
}
//# sourceMappingURL=sheet-model.js.map