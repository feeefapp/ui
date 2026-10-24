import { rectGap } from './geometry.js';
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
/** Closest candidate within `spacing`, preferring the largest overlap, then the smallest gap. */
function nearest(rect, candidates, spacing) {
    let best = null;
    for (const [id, other] of candidates) {
        const gap = rectGap(rect, other);
        if (gap > spacing)
            continue;
        const shared = overlap(rect, other);
        if (!best || shared > best.overlap || (shared === best.overlap && gap < best.gap))
            best = { id, rect: other, overlap: shared, gap };
    }
    return best;
}
/**
 * Plans births and deaths between two measurements.
 * @param previous current visual rects of bubbles drawn before the change (including ones leaving)
 * @param next target rects of the bubbles present after the change
 */
export function planGlassTransition(previous, next, spacing) {
    const leaving = new Map([...previous].filter(([id]) => !next.has(id)));
    const staying = new Map([...previous].filter(([id]) => next.has(id)));
    const births = [];
    for (const [id, rect] of next) {
        if (previous.has(id))
            continue;
        // Prefer a bubble that just left (a split or a replacement), then a living neighbour.
        const source = nearest(rect, leaving, spacing) ?? nearest(rect, staying, spacing);
        births.push(source ? { id, kind: 'grow', source: source.id, from: source.rect } : { id, kind: 'materialize' });
    }
    const deaths = [];
    for (const [id, rect] of leaving) {
        // In a split the parent is absorbed into the child it overlaps most while the children
        // grow out of it, so the glass never has a gap.
        const target = nearest(rect, next, spacing);
        deaths.push(target ? { id, kind: 'absorb', target: target.id, into: target.rect } : { id, kind: 'dematerialize' });
    }
    return { births, deaths };
}
/** True when `a` and `b` describe the same rect within half a pixel. */
export function sameRect(a, b) {
    return (Math.abs(a.x - b.x) < 0.5 &&
        Math.abs(a.y - b.y) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5);
}
/**
 * Mark an element with this attribute while it moves as one piece (a presentation surface entering
 * or leaving): the glass inside it takes every layout change at once, with no births, deaths or
 * springs, so it rides the element's transform and leaves with it in the same frames.
 */
export const GLASS_INSTANT_ATTRIBUTE = 'data-glass-instant';
/** For this long (ms) after glass first appears, its bubbles appear in place (lazy content). */
export const GLASS_SETTLE_MS = 300;
/**
 * Whether a layout change applies at once instead of springing: with reduced motion, inside an
 * element marked `GLASS_INSTANT_ATTRIBUTE`, before the container has ever been rendered
 * (`shownAt` null: glass measured inside a closed dialog or a hidden panel must not grow in once
 * shown), and for `GLASS_SETTLE_MS` after it first was.
 */
export function glassChangesAtOnce(options) {
    const { reduceMotion, instant, shownAt, now } = options;
    return reduceMotion || instant || shownAt === null || now - shownAt < GLASS_SETTLE_MS;
}
//# sourceMappingURL=transitions.js.map