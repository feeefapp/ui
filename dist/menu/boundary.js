'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
const BoundaryContext = React.createContext(null);
/**
 * The bounds of an app that does not fill the window (a phone frame, an embedded preview, a
 * resizable pane). Menus, selects, popovers and tooltips opened inside it render inside it and
 * never cross its edges; outside one they stay inside the window. Renders a `div` (positioned, so
 * floating panels place themselves against it) that takes any div attribute.
 */
export const FloatingBoundary = React.forwardRef(({ className, children, ...props }, ref) => {
    const [element, setElement] = React.useState(null);
    const setRefs = React.useCallback((node) => {
        setElement(node);
        if (typeof ref === 'function')
            ref(node);
        else if (ref)
            ref.current = node;
    }, [ref]);
    return (_jsx("div", { ...props, ref: setRefs, className: cn('lab-floating-boundary', className), "data-lab-boundary": "", children: _jsx(BoundaryContext.Provider, { value: element, children: children }) }));
});
FloatingBoundary.displayName = 'FloatingBoundary';
/**
 * Makes `element` the place floating panels render into, without adding a box: presentation
 * surfaces (modal, sheet, drawer, pane) wrap their content in it, so a menu, select or popover
 * opened inside a modal `<dialog>` joins it in the top layer instead of rendering behind it.
 */
export function FloatingPortalScope({ element, children }) {
    return _jsx(BoundaryContext.Provider, { value: element, children: children });
}
/**
 * The nearest `FloatingBoundary` (or presentation surface) element, or null when the app fills the window. Pass it as a
 * Radix `collisionBoundary` and as the portal `container` of anything that floats.
 */
export function useFloatingBoundary() {
    return React.useContext(BoundaryContext);
}
//# sourceMappingURL=boundary.js.map