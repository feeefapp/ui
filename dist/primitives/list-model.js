/** Pure decisions for list rows: where a swipe lands, and where a dragged row would drop. */
import { projectMomentum } from '../physics/spring.js';
/** Fraction of the row past which a swipe runs the first action. */
export const LAB_FULL_SWIPE = 0.55;
/**
 * Where a released row goes. `offset` is logical: positive moves the row toward the end and shows
 * leading actions; negative shows trailing ones. Velocity is in the same units per second.
 */
export function swipeRelease(offset, velocity, s) {
    const full = s.row * LAB_FULL_SWIPE;
    if (offset > full && s.fullLeading && s.leading)
        return { offset: s.row, commit: 'leading' };
    if (offset < -full && s.fullTrailing && s.trailing)
        return { offset: -s.row, commit: 'trailing' };
    const projected = projectMomentum(offset, velocity, 0.99);
    if (projected > s.leading / 2 && s.leading && offset > 0)
        return { offset: s.leading, commit: null };
    if (projected < -s.trailing / 2 && s.trailing && offset < 0)
        return { offset: -s.trailing, commit: null };
    return { offset: 0, commit: null };
}
/** Whether a row dragged to `offset` is in full-swipe territory (the first action takes over). */
export function swipeIsFull(offset, s) {
    const full = s.row * LAB_FULL_SWIPE;
    return (offset > full && s.fullLeading && s.leading > 0) || (offset < -full && s.fullTrailing && s.trailing > 0);
}
/**
 * The index a dragged item would drop at. `heights` are the items' heights in order, `from` the
 * dragged item's index and `delta` how far it has moved (px, down positive). An item moves aside
 * once the dragged item's center passes its center.
 */
export function reorderTarget(heights, from, delta) {
    const tops = [];
    let y = 0;
    for (const h of heights) {
        tops.push(y);
        y += h;
    }
    const center = tops[from] + heights[from] / 2 + delta;
    let to = from;
    for (let j = from + 1; j < heights.length; j++)
        if (center > tops[j] + heights[j] / 2)
            to = j;
    for (let j = from - 1; j >= 0; j--)
        if (center < tops[j] + heights[j] / 2)
            to = j;
    return to;
}
/** How far each item shifts to open the gap at `to` while item `from` is dragged. */
export function reorderShifts(heights, from, to) {
    return heights.map((_, j) => j === from ? 0 : from < to && j > from && j <= to ? -heights[from] : to < from && j >= to && j < from ? heights[from] : 0);
}
/** Where the dragged item lands relative to its start, once it drops at `to`. */
export function reorderLanding(heights, from, to) {
    let sum = 0;
    if (to > from)
        for (let j = from + 1; j <= to; j++)
            sum += heights[j];
    else
        for (let j = to; j < from; j++)
            sum -= heights[j];
    return sum;
}
//# sourceMappingURL=list-model.js.map