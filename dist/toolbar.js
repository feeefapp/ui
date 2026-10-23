'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
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
 * One glass pill for related toolbar controls (`role="group"`). Children use
 * `appearance="toolbar"` and the default `regular` size, which the group sets to fill its
 * `--lab-toolbar-item` bubble (44px comfortable, controls 38px; the bubble is at least 44px on touch).
 */
export const ToolbarGroup = forwardRef(function ToolbarGroup({ label, className, ...props }, ref) {
    return _jsx(GlassGroup, { ...props, ref: ref, className: cn('lab-toolbar-group', className), role: "group", "aria-label": label });
});
//# sourceMappingURL=toolbar.js.map