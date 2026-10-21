'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from './utils.js';
import { LabGlassGroup } from './scaffold.js';
import './toolbar.css';
/** Unpainted layout; only related controls share a material. Normal Tab order is preserved. */
export function LabToolbar({ label, leading, trailing, className, ...props }) {
    return (_jsxs("div", { ...props, className: cn('lab-toolbar-layout', className), role: "group", "aria-label": label, children: [_jsx("div", { className: "lab-toolbar-leading", children: leading }), trailing && _jsx("div", { className: "lab-toolbar-trailing", children: trailing })] }));
}
export const LabToolbarGroup = forwardRef(function LabToolbarGroup({ label, className, ...props }, ref) {
    return _jsx(LabGlassGroup, { ...props, ref: ref, className: cn('lab-toolbar-group', className), role: "group", "aria-label": label });
});
//# sourceMappingURL=toolbar.js.map