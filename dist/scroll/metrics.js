export const SCROLL_FADE_ZONE = 80;
export const SCROLL_REST_TOP = 0.28;
export const SCROLL_REST_BOTTOM = 0.48;
const nonnegative = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const clamp = (value) => Math.max(0, Math.min(1, value));
/** Mirrors Merchant ScrollGradientOverlay, including underflow and overscroll. */
export function scrollEdgeOpacities(offset, extent, fadeZone = SCROLL_FADE_ZONE) {
    const max = nonnegative(extent);
    if (max <= 1)
        return { top: SCROLL_REST_TOP, bottom: SCROLL_REST_BOTTOM };
    const position = Math.min(max, nonnegative(offset));
    const zone = Math.max(1, nonnegative(fadeZone));
    return { top: clamp(position / zone), bottom: clamp((max - position) / zone) };
}
/** Float height plus the edge gap on both sides. A missing float leaves normal content padding. */
export function scrollContentReserve(height, gap, padding) {
    return height > 0 ? nonnegative(height) + nonnegative(gap) * 2 : nonnegative(padding);
}
/** Minimum movement to reveal one interval, without moving an enclosing workspace. */
export function scrollRevealDelta(start, end, visibleStart, visibleEnd, alignment = 'nearest') {
    if (![start, end, visibleStart, visibleEnd].every(Number.isFinite))
        return 0;
    if (alignment === 'center')
        return (start + end - visibleStart - visibleEnd) / 2;
    if (start < visibleStart && end > visibleEnd)
        return 0;
    if (start < visibleStart)
        return start - visibleStart;
    if (end > visibleEnd)
        return end - visibleEnd;
    return 0;
}
/** Static seeded square dithering; no random flicker or per-scroll geometry work. */
export function scrollWashPaths(columns, rows) {
    const buckets = Array.from({ length: 12 }, () => '');
    for (let y = 0; y < rows; y++) {
        const falloff = (1 - y / Math.max(1, rows - 1)) ** 2;
        for (let x = 0; x < columns; x++) {
            const noise = (((Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263)) >>> 0) % 100) / 100;
            const level = Math.round(Math.max(0, Math.min(1, falloff + (noise - 0.5) * 0.3)) * 11);
            if (level > 0)
                buckets[level] += `M${x} ${y}h1v1h-1z`;
        }
    }
    return buckets;
}
//# sourceMappingURL=metrics.js.map