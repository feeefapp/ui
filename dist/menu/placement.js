/**
 * Pure placement rules shared with the Flutter twin (`flutter/lib/menu/placement.dart`). All
 * rects are physical, in one coordinate space (the viewport on the web).
 */
/** The Radix (physical) side for a logical menu side. */
export function physicalMenuSide(side, rtl) {
    if (side === 'start')
        return rtl ? 'right' : 'left';
    if (side === 'end')
        return rtl ? 'left' : 'right';
    return side;
}
/**
 * A panel beside its trigger (Radix side `left`/`right`, start-aligned) that fits neither side is
 * never squeezed: it drops right below the trigger, lined up with the trigger's start edge and
 * shifted inside `bounds` (a submenu in a narrow window covers its parent menu under its row, like
 * iOS).
 * Returns the Radix `sideOffset` and `alignOffset` that put it there while Radix keeps `side`, or
 * null when one side has room for `width`. `bounds` is already inset by the collision padding.
 * The Flutter twin is the side fallback in `placeAnchoredPanel`.
 */
export function sidePanelFallback({ trigger, bounds, width, gap, side, rtl, }) {
    const right = bounds.right - Math.max(bounds.left, trigger.right + gap);
    const left = Math.min(bounds.right, trigger.left - gap) - bounds.left;
    if (width <= Math.max(right, left, 0))
        return null;
    const start = rtl ? trigger.right - width : trigger.left;
    const x = Math.min(Math.max(start, bounds.left), Math.max(bounds.left, bounds.right - width));
    return {
        sideOffset: side === 'right' ? x - trigger.right : trigger.left - (x + width),
        // Right under the row: Radix's sticky shift never moves a side panel past its trigger's edge.
        alignOffset: trigger.bottom - trigger.top,
    };
}
//# sourceMappingURL=placement.js.map