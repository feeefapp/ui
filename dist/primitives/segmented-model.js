import { mix, projectMomentum, rubberBandClamp } from '../physics/spring.js';
import { scrollRevealDelta } from '../scroll/metrics.js';
/** How far (px) the pill can be pulled past either end, with rubber-band resistance. */
export const SEGMENTED_OVERDRAG = 12;
/** Deceleration a release is projected with (`projectMomentum`): quicker than a scroll view (0.99), so
 * a flick reaches the next segment without skipping one. */
export const SEGMENTED_DECELERATION = 0.97;
/** Travel (px) before a press becomes a drag: mouse and pen, then touch. */
export const SEGMENTED_SLOP = { mouse: 4, touch: 10 };
/** Centre of a segment. */
export function segmentCenter(span) {
    return span.start + span.width / 2;
}
/** Index of the segment under `x`; a point in a gap or past an end goes to the nearest segment. */
export function segmentIndexAt(x, spans) {
    let best = -1;
    let distance = Infinity;
    spans.forEach((span, index) => {
        const d = x < span.start ? span.start - x : x > span.start + span.width ? x - span.start - span.width : 0;
        if (d < distance) {
            best = index;
            distance = d;
        }
    });
    return best;
}
/**
 * The pill's centre while dragged: the pointer less where it grabbed the pill, kept between the
 * first and last segment centres (so the pill stays on the track), with a slight rubber band past
 * either end.
 */
export function segmentedDragCenter(pointer, grab, spans) {
    if (!spans.length)
        return pointer - grab;
    return rubberBandClamp(pointer - grab, segmentCenter(spans[0]), segmentCenter(spans[spans.length - 1]), SEGMENTED_OVERDRAG);
}
/** The pill's width with its centre at `center`: it changes from one segment's width to the next. */
export function segmentedPillWidth(center, spans) {
    if (!spans.length)
        return 0;
    if (center <= segmentCenter(spans[0]))
        return spans[0].width;
    for (let i = 0; i < spans.length - 1; i++) {
        const a = segmentCenter(spans[i]);
        const b = segmentCenter(spans[i + 1]);
        if (center <= b)
            return mix(spans[i].width, spans[i + 1].width, b === a ? 1 : (center - a) / (b - a));
    }
    return spans[spans.length - 1].width;
}
/**
 * Where a released pill settles: the enabled segment nearest to where its momentum would carry it
 * (a quick flick reaches the next segment, a careful drop stays put). -1 when every one is disabled.
 */
export function segmentedSnapIndex(center, velocity, spans) {
    const projected = projectMomentum(center, velocity, SEGMENTED_DECELERATION);
    let best = -1;
    let distance = Infinity;
    spans.forEach((span, index) => {
        if (span.disabled)
            return;
        const d = Math.abs(segmentCenter(span) - projected);
        if (d < distance) {
            best = index;
            distance = d;
        }
    });
    return best;
}
/** Length (px) of the fade at an edge of a control that scrolls, and the scroll distance over which
 * it fades in (`scrollEdgeOpacities`); a revealed option also stops this far from the edge. */
export const SEGMENTED_FADE = 24;
/** How far (px) a scrolling control's clip reaches above and below it, so a pressed pill can swell
 * and cast its shadow without being cut. */
export const SEGMENTED_BLEED = 8;
/** Distance (px) from a visible edge inside which a dragged pill scrolls the control. */
export const SEGMENTED_AUTOSCROLL_ZONE = 40;
/** Fastest auto-scroll (px/s): the pointer at or past the edge. */
export const SEGMENTED_AUTOSCROLL_SPEED = 720;
/**
 * Auto-scroll speed (px/s, physical: positive shows more of the right) for a pill dragged with the
 * pointer at `pointer` in a viewport spanning `viewStart`…`viewEnd`: zero in the middle, easing in
 * (quadratically) inside `SEGMENTED_AUTOSCROLL_ZONE` of either edge (a third of a narrow viewport)
 * up to `SEGMENTED_AUTOSCROLL_SPEED` at the edge and beyond.
 */
export function segmentedAutoScrollSpeed(pointer, viewStart, viewEnd) {
    const width = viewEnd - viewStart;
    if (!(width > 0) || !Number.isFinite(pointer))
        return 0;
    const zone = Math.min(SEGMENTED_AUTOSCROLL_ZONE, width / 3);
    const ramp = (distance) => {
        const t = Math.max(0, Math.min(1, (zone - distance) / zone));
        return t * t * SEGMENTED_AUTOSCROLL_SPEED;
    };
    const toStart = pointer - viewStart;
    const toEnd = viewEnd - pointer;
    if (toStart < zone && toStart <= toEnd)
        return -ramp(toStart);
    if (toEnd < zone)
        return ramp(toEnd);
    return 0;
}
/**
 * The scroll offset (px from the left, physical) that shows the option spanning `start`…`end`
 * (content px) in a `viewport` px wide view scrolled to `offset` of at most `max`, clear of the edge
 * fades by `padding`: the least movement, as `revealScrollChild` does with the control's
 * `scroll-padding`.
 */
export function segmentedRevealOffset(offset, max, viewport, start, end, padding = SEGMENTED_FADE) {
    const delta = scrollRevealDelta(start - offset, end - offset, padding, Math.max(padding, viewport - padding));
    return Math.max(0, Math.min(Math.max(0, max), offset + delta));
}
//# sourceMappingURL=segmented-model.js.map