/** Pure model of a navigation stack: what changed between two page lists, and frame geometry. */
/** Classifies how a stack went from `previous` page keys to `next`, root first. */
export function diffStack(previous, next) {
    const prevTop = previous[previous.length - 1] ?? null;
    const nextTop = next[next.length - 1] ?? null;
    if (prevTop === nextTop)
        return { kind: 'none' };
    let shared = 0;
    while (shared < previous.length && shared < next.length && previous[shared] === next[shared])
        shared++;
    if (shared === previous.length)
        return { kind: 'push', enter: nextTop, exit: prevTop };
    if (shared === next.length)
        return { kind: 'pop', enter: nextTop, exit: prevTop, removed: previous.slice(shared) };
    return { kind: 'replace', enter: nextTop, exit: prevTop, removed: previous.slice(shared) };
}
/** How far (fraction of the width) the page underneath slides while a page covers it, like iOS. */
export const STACK_PARALLAX = 0.3;
/**
 * Horizontal offsets in px for a slide transition. `shown` is how much the front page covers the
 * back one: 0 = front fully off its trailing edge, 1 = front in place. Mirrored for RTL.
 */
export function slideFrame(shown, width, rtl) {
    const sign = rtl ? -1 : 1;
    return {
        front: sign * (1 - shown) * width,
        back: -sign * STACK_PARALLAX * Math.max(0, Math.min(1, shown)) * width,
        dim: Math.max(0, Math.min(1, shown)),
    };
}
/** Interpolates two rects; `progress` is not clamped, so springs can overshoot through it. */
export function mixRect(from, to, progress) {
    const m = (a, b) => a + (b - a) * progress;
    return { x: m(from.x, to.x), y: m(from.y, to.y), width: m(from.width, to.width), height: m(from.height, to.height) };
}
/**
 * Paint for a page of `page` size shown inside `rect` (stack coordinates): a uniform scale that
 * matches the rect's width, a translation to its corner, and a clip that crops the page's bottom
 * to the rect's height with `radius` corners (in screen px). Content is never stretched.
 */
export function zoomFrame(rect, radius, page) {
    const scale = Math.max(0.0001, rect.width / Math.max(1, page.width));
    const visibleHeight = rect.height / scale;
    return {
        scale,
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0) scale(${scale})`,
        clip: `inset(0 0 ${Math.max(0, page.height - visibleHeight)}px 0 round ${Math.max(0, radius) / scale}px)`,
    };
}
/**
 * Where a zoomed page sits while it is dragged to dismiss: it shrinks as it is pulled and the point
 * first grabbed stays under the finger. `anchor` is that point in page coordinates; `pull` is how
 * far it has been pulled toward dismissal (defaults to the downward movement).
 */
export function dragDismissRect(page, anchor, dx, dy, pull = Math.max(0, dy)) {
    const scale = 1 - 0.4 * (1 - 1 / (1 + Math.max(0, pull) / (page.height * 0.5)));
    const width = page.width * scale, height = page.height * scale;
    const up = dy < 0 ? -(1 - 1 / ((-dy * 0.55) / page.height + 1)) * page.height : 0;
    return {
        x: anchor.x + dx - anchor.x * scale,
        y: anchor.y + (dy > 0 ? dy : up) - anchor.y * scale,
        width,
        height,
    };
}
//# sourceMappingURL=stack-model.js.map