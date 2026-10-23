/**
 * Pure placement rules shared with the Flutter twin (`flutter/lib/menu/placement.dart`). All
 * rects are physical, in one coordinate space (the viewport on the web).
 */
/** Where a menu that doesn't cover its trigger opens. `start`/`end` follow the reading direction. */
export type MenuSide = 'top' | 'bottom' | 'start' | 'end';
export type PlacementRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};
/** The Radix (physical) side for a logical menu side. */
export declare function physicalMenuSide(side: MenuSide, rtl: boolean): 'top' | 'bottom' | 'left' | 'right';
/**
 * A panel beside its trigger (Radix side `left`/`right`, start-aligned) that fits neither side is
 * never squeezed: it drops right below the trigger, lined up with the trigger's start edge and
 * shifted inside `bounds` (a submenu in a narrow window covers its parent menu under its row, like
 * iOS).
 * Returns the Radix `sideOffset` and `alignOffset` that put it there while Radix keeps `side`, or
 * null when one side has room for `width`. `bounds` is already inset by the collision padding.
 * The Flutter twin is the side fallback in `placeAnchoredPanel`.
 */
export declare function sidePanelFallback({ trigger, bounds, width, gap, side, rtl, }: {
    trigger: PlacementRect;
    bounds: PlacementRect;
    width: number;
    gap: number;
    side: 'left' | 'right';
    rtl: boolean;
}): {
    sideOffset: number;
    alignOffset: number;
} | null;
//# sourceMappingURL=placement.d.ts.map