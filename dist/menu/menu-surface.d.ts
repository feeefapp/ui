import * as React from 'react';
import { type MenuSide } from './placement.js';
import './menu.css';
/** Minimum distance between a floating panel and the edges of its bounds, in px. */
export declare const MENU_COLLISION_PADDING = 12;
export type MenuSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the Radix content part (DropdownMenu, Select or Popover `Content`) instead of rendering a div. */
    asChild?: boolean;
    /**
     * The menu covers the button that opened it and grows out of it (default). False opens it beside
     * its trigger on `side`, `gap` away and lined up with the trigger's start edge: submenus, or a
     * sidebar rail item's menu.
     */
    cover?: boolean;
    /**
     * Where the menu opens when `cover` is false (logical: `end` is right in LTR). Radix flips it when
     * there is no room; a menu beside its trigger that fits neither side drops below the trigger
     * instead of being squeezed. Submenus always open toward the inline end (Radix `SubContent`).
     */
    side?: MenuSide;
    /** Distance from the trigger when `cover` is false, in px. */
    gap?: number;
};
/**
 * The kit's menu: one Liquid Glass bubble that grows out of the button that opened it (the button
 * pinches, the bubble springs to the menu's size on `SPRINGS.menu`, the rows sharpen inside it) and
 * flies back into it when it closes. It covers its trigger, lines up with the trigger's edge in
 * toolbars and centres on it elsewhere, and stays inside the nearest `FloatingBoundary` (else the
 * window). With `asChild` it decorates a Radix content part: Radix keeps focus, keyboard and
 * dismissal; the surface supplies placement defaults (`sideOffset`, `align`, `collisionBoundary`,
 * `collisionPadding`) that the content's own props override. Reduced motion crossfades instead;
 * reduced transparency and more contrast paint it solid.
 */
export declare const MenuSurface: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the Radix content part (DropdownMenu, Select or Popover `Content`) instead of rendering a div. */
    asChild?: boolean;
    /**
     * The menu covers the button that opened it and grows out of it (default). False opens it beside
     * its trigger on `side`, `gap` away and lined up with the trigger's start edge: submenus, or a
     * sidebar rail item's menu.
     */
    cover?: boolean;
    /**
     * Where the menu opens when `cover` is false (logical: `end` is right in LTR). Radix flips it when
     * there is no room; a menu beside its trigger that fits neither side drops below the trigger
     * instead of being squeezed. Submenus always open toward the inline end (Radix `SubContent`).
     */
    side?: MenuSide;
    /** Distance from the trigger when `cover` is false, in px. */
    gap?: number;
} & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=menu-surface.d.ts.map