import * as React from 'react';
export type FloatingBoundaryProps = React.HTMLAttributes<HTMLDivElement>;
/**
 * The bounds of an app that does not fill the window (a phone frame, an embedded preview, a
 * resizable pane). Menus, selects, popovers and tooltips opened inside it render inside it and
 * never cross its edges; outside one they stay inside the window. Renders a `div` (positioned, so
 * floating panels place themselves against it) that takes any div attribute.
 */
export declare const FloatingBoundary: React.ForwardRefExoticComponent<FloatingBoundaryProps & React.RefAttributes<HTMLDivElement>>;
/**
 * Makes `element` the place floating panels render into, without adding a box: presentation
 * surfaces (modal, sheet, drawer, pane) wrap their content in it, so a menu, select or popover
 * opened inside a modal `<dialog>` joins it in the top layer instead of rendering behind it.
 */
export declare function FloatingPortalScope({ element, children }: {
    element: HTMLElement | null;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * The nearest `FloatingBoundary` (or presentation surface) element, or null when the app fills the window. Pass it as a
 * Radix `collisionBoundary` and as the portal `container` of anything that floats.
 */
export declare function useFloatingBoundary(): HTMLElement | null;
//# sourceMappingURL=boundary.d.ts.map