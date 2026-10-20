'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle } from 'react';
import { cn } from '../utils.js';
import { LabGlassGroup } from '../scaffold.js';
import { LabDockContentSwap } from './content-swap.js';
import './dock.css';
import { useDockSize } from './use_dock_size.js';
import { LabActionsWidthProvider } from '../actions/width-context.js';
/** Floating glass container; positioning and scroll reservations belong to its host. */
export const LabDock = forwardRef(function LabDock({ label, content, children, align = 'center', swapKey = 'default', className, ...props }, ref) {
    const measured = useDockSize();
    useImperativeHandle(ref, () => measured.surface.current, []);
    return (_jsx("div", { ref: measured.host, className: cn('lab-dock-host', `lab-dock-host--${align}`), children: _jsx(LabGlassGroup, { ...props, ref: measured.surface, style: { ...props.style, ...measured.shellStyle }, className: cn('lab-dock', className), role: props.role ?? 'group', "aria-label": label, tabIndex: -1, "data-lab-dock": true, children: _jsx("div", { ref: measured.body, className: "lab-dock-body", style: measured.bodyStyle, children: _jsx(LabActionsWidthProvider, { value: measured.actionsMaxWidth, children: _jsx(LabDockContentSwap, { swapKey: swapKey, children: _jsxs("div", { className: "lab-dock-row", children: [content && _jsx("div", { className: "lab-dock-content", children: content }), _jsx("div", { className: "lab-dock-actions", children: children })] }) }) }) }) }) }));
});
//# sourceMappingURL=dock.js.map