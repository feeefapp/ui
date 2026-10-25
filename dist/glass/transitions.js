import { rectGap } from './geometry.js';
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
/** True when `a` and `b` share some height: bubbles of one row. */
export function sameGlassRow(a, b) {
    return Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0;
}
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
/** Closest candidate at any distance: one in the same row first, then the smallest gap. */
function neighbour(rect, candidates) {
    let best = null;
    for (const [id, other] of candidates) {
        const row = sameGlassRow(rect, other);
        const gap = rectGap(rect, other);
        if (!best || (row && !best.row) || (row === best.row && gap < best.gap))
            best = { id, rect: other, row, gap };
    }
    return best;
}
/**
 * The droplet a bubble is born from, or absorbed into, at `anchor`'s end facing `toward`: a round
 * drop as tall (stacked: as wide) as the smaller of the two, tucked inside that end so it is hidden
 * in the anchor's glass. A new bubble stretches out of its neighbour from there instead of sliding
 * out from under it, and a leaving one shrinks back into it without a trace.
 */
export function glassSeed(anchor, toward) {
    const ax = anchor.x + anchor.width / 2;
    const ay = anchor.y + anchor.height / 2;
    const tx = toward.x + toward.width / 2;
    const ty = toward.y + toward.height / 2;
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const horizontal = sameGlassRow(anchor, toward) || Math.abs(tx - ax) * anchor.height >= Math.abs(ty - ay) * anchor.width;
    if (horizontal) {
        const height = Math.min(anchor.height, toward.height);
        const width = Math.min(height, toward.width, anchor.width);
        const x = tx >= ax ? anchor.x + anchor.width - width : anchor.x;
        const cy = clamp(ty, anchor.y + height / 2, anchor.y + anchor.height - height / 2);
        return { x, y: cy - height / 2, width, height };
    }
    const width = Math.min(anchor.width, toward.width);
    const height = Math.min(width, toward.height, anchor.height);
    const y = ty >= ay ? anchor.y + anchor.height - height : anchor.y;
    const cx = clamp(tx, anchor.x + width / 2, anchor.x + anchor.width - width / 2);
    return { x: cx - width / 2, y, width, height };
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
        // A bubble that just left right here (a split or a replacement), else the nearest neighbour
        // that stays, else the nearest one leaving.
        const source = nearest(rect, leaving, spacing) ?? neighbour(rect, staying) ?? neighbour(rect, leaving);
        if (!source)
            births.push({ id, kind: 'materialize' });
        else
            births.push({
                id,
                kind: 'grow',
                source: source.id,
                from: overlap(source.rect, rect) > 0 ? source.rect : glassSeed(source.rect, rect),
            });
    }
    const deaths = [];
    for (const [id, rect] of leaving) {
        // In a split the parent is absorbed into the child it overlaps most while the children grow
        // out of it, so the glass never has a gap; otherwise into its nearest neighbour.
        const target = nearest(rect, next, spacing) ?? neighbour(rect, next);
        if (!target)
            deaths.push({ id, kind: 'dematerialize' });
        else
            deaths.push({
                id,
                kind: 'absorb',
                target: target.id,
                into: overlap(target.rect, rect) > 0 ? target.rect : glassSeed(target.rect, rect),
            });
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
/**
 * Fired (bubbling) on an element that stops moving as one piece. A transform on an ancestor of a
 * container never reaches its observers, so the glass inside measures its resting layout now.
 */
export const GLASS_SETTLED_EVENT = 'lab-glass-settled';
/** Ends an element's `GLASS_INSTANT_ATTRIBUTE` ride and has the glass inside it measure again. */
export function settleGlass(element) {
    element.removeAttribute(GLASS_INSTANT_ATTRIBUTE);
    element.dispatchEvent(new Event(GLASS_SETTLED_EVENT, { bubbles: true }));
}
/**
 * Put this attribute on content that animates its own size inside a bubble (a segmented control
 * folding into its menu): while it is there, the glass of every bubble in that container follows
 * the layout exactly instead of springing after it (like `glassMotion="follow"`), so the content
 * never pokes out of its glass and the neighbours it pushes never overlap it.
 */
export const GLASS_FOLLOW_ATTRIBUTE = 'data-glass-follow';
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