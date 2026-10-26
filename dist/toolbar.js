'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, forwardRef, useContext } from 'react';
import { cn } from './utils.js';
import { GlassGroup } from './scaffold.js';
import { GlassScope } from './glass/container.js';
import './toolbar.css';
/**
 * Unpainted toolbar row: `leading` at the start, `trailing` at the end, empty space between them
 * passes pointer input through to the content below. Only related controls share a material (put
 * them in ToolbarGroups). Normal Tab order is preserved.
 */
export function Toolbar({ label, leading, trailing, className, ...props }) {
    return (_jsxs(GlassScope, { ...props, className: cn('lab-toolbar-layout', className), role: "group", "aria-label": label, children: [_jsx("div", { className: "lab-toolbar-leading", children: leading }), trailing && _jsx("div", { className: "lab-toolbar-trailing", children: trailing })] }));
}
/**
 * The orientation ToolbarGroups take when they don't set one. A collapsed sidebar (the scaffold's
 * rail) provides `vertical`, so its bottom groups stack their controls in a column that fits.
 */
export const ToolbarOrientationContext = createContext('horizontal');
/**
 * One glass pill for related toolbar controls (`role="group"`). Children use
 * `appearance="toolbar"` and the default `regular` size, which the group sets to fill its
 * `--lab-toolbar-item` bubble (44px comfortable, controls 38px; the bubble is at least 44px on touch).
 */
export const ToolbarGroup = forwardRef(function ToolbarGroup({ label, orientation, className, ...props }, ref) {
    const inherited = useContext(ToolbarOrientationContext);
    return (_jsx(GlassGroup, { ...props, ref: ref, className: cn('lab-toolbar-group', className), role: "group", "aria-label": label, "data-orientation": orientation ?? inherited }));
});
//# sourceMappingURL=toolbar.js.map