/** No glass side is ever longer than this (px): longer is a broken layout, never a bubble. */
export const GLASS_MAX_SIDE = 8192;
/** A bubble may span at most this many times the larger side of its container or the viewport. */
export const GLASS_MAX_SPAN = 4;
/**
 * The rect a member's glass may use, in container pixels, or null when the member is not drawable
 * glass: non-finite or empty, longer than `GLASS_MAX_SIDE`, or longer than `GLASS_MAX_SPAN` times
 * the larger side of the container or viewport (an error box overflowing by 200,000 px). The rest
 * is clamped to the container grown by `margin` or the viewport's longer side, whichever is more
 * (a bubble scrolled partly out of its row keeps its true shape), so no outline, lens map,
 * reflection or shadow is ever built from an unclamped size.
 */
export function glassMemberRect(rect, container, viewport, margin) {
    const { x, y, width, height } = rect;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        return null;
    const reach = Math.max(container.width, container.height, viewport.width, viewport.height);
    const limit = Math.min(GLASS_MAX_SIDE, Number.isFinite(reach) && reach > 0 ? reach * GLASS_MAX_SPAN : GLASS_MAX_SIDE);
    if (width > limit || height > limit)
        return null;
    const grow = Math.max(margin, Number.isFinite(viewport.width) ? viewport.width : 0, Number.isFinite(viewport.height) ? viewport.height : 0);
    const left = Math.max(x, -grow);
    const top = Math.max(y, -grow);
    const right = Math.min(x + width, container.width + grow);
    const bottom = Math.min(y + height, container.height + grow);
    if (right <= left || bottom <= top)
        return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
}
//# sourceMappingURL=member-bounds.js.map