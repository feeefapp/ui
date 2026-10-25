/**
 * The tab bar's minimize morph as pure geometry (twin: flutter/lib/containers/tab_view_minimize.dart).
 * One progress value runs from 0 (the full bar, the accessory above it) to 1 (the selected tab as a
 * round bubble at the leading edge, the accessory filling the rest of the row). Scrolling moves the
 * progress; every frame places the pieces between the boxes measured at rest.
 */
/** Scroll distance (px) that takes the bar from full to minimized. */
export const MINIMIZE_DISTANCE = 56;
/** Scrolling back up restores it over a shorter distance, so the bar returns readily. */
export const RESTORE_DISTANCE = 40;
/** The minimized bubble's diameter (iOS 27: a 40pt tab in a 48pt glass circle), centred on the
 * line the full bar sat on. */
export const MINIMIZED_SIZE = 48;
/** Within this distance of the top the bar can't be more minimized than the scroll position allows. */
export const MINIMIZE_TOP = 24;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** The bar gives up its width early... */
const early = (t) => 1 - (1 - t) ** 4;
/** ...and the accessory drops into the row only once the bar has made room (smoothstep, delayed). */
const descend = (t) => {
    const u = clamp01((t - 0.35) / 0.65);
    return u * u * (3 - 2 * u);
};
/** The progress after the content scrolled by `delta` px to `top`. */
export function minimizeProgress(progress, delta, top) {
    if (top <= 0)
        return 0;
    const next = progress + delta / (delta > 0 ? MINIMIZE_DISTANCE : RESTORE_DISTANCE);
    return clamp01(Math.min(next, top / MINIMIZE_TOP));
}
/** Where the pieces sit at progress `t`. */
export function minimizeGeometry(at, t) {
    const p = clamp01(t);
    const round = Math.min(at.bar.height, MINIMIZED_SIZE);
    const barEnd = at.rtl ? at.chrome.width - round : 0;
    const shrink = early(p);
    const height = lerp(at.bar.height, round, shrink);
    const bar = {
        x: lerp(at.bar.x, barEnd, shrink),
        y: at.bar.y + (at.bar.height - height) / 2,
        width: lerp(at.bar.width, round, shrink),
        height,
    };
    let accessory = null;
    if (at.accessory) {
        const a = at.accessory;
        const y = lerp(a.y, at.bar.y + (at.bar.height - a.height) / 2, descend(p));
        // Its outer edge glides to the chrome's edge; its inner edge never crosses the shrinking bar
        // once the two share a row, so the accessory makes room as the bar gives it.
        const sharesRow = y + a.height > at.bar.y;
        if (at.rtl) {
            const left = lerp(a.x, 0, shrink);
            let right = lerp(a.x + a.width, at.chrome.width - round - at.gap, shrink);
            if (sharesRow)
                right = Math.min(right, bar.x - at.gap);
            accessory = { x: left, y, width: Math.max(0, right - left) };
        }
        else {
            const right = lerp(a.x + a.width, at.chrome.width, shrink);
            let left = lerp(a.x, round + at.gap, shrink);
            if (sharesRow)
                left = Math.max(left, bar.x + bar.width + at.gap);
            accessory = { x: left, y, width: Math.max(0, right - left) };
        }
    }
    const optionCentre = at.option.x - at.bar.x + at.option.width / 2;
    const optionMiddle = at.option.y - at.bar.y + at.option.height / 2;
    return {
        bar,
        accessory,
        trackShift: { x: (round / 2 - optionCentre) * shrink, y: (round / 2 - optionMiddle) * shrink },
        icon: { dx: at.icon.dx * p, dy: at.icon.dy * p },
    };
}
//# sourceMappingURL=tab-view-minimize.js.map