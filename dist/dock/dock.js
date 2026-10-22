'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle } from 'react';
import { cn } from '../utils.js';
import { GlassGroup } from '../scaffold.js';
import { DockContentSwap } from './content-swap.js';
import './dock.css';
import { useDockSize } from './use_dock_size.js';
import { ActionsWidthProvider } from '../actions/width-context.js';
/**
 * Floating glass container for a status tile and its actions. It hugs its content up to the host's
 * width and animates size changes; positioning and scroll reservations belong to its host.
 */
export const Dock = forwardRef(function Dock({ label, content, children, align = 'center', swapKey = 'default', className, ...props }, ref) {
    const measured = useDockSize();
    useImperativeHandle(ref, () => measured.surface.current, []);
    return (_jsx("div", { ref: measured.host, className: cn('lab-dock-host', `lab-dock-host--${align}`), children: _jsx(GlassGroup, { ...props, ref: measured.surface, style: { ...props.style, ...measured.shellStyle }, className: cn('lab-dock', className), glassMotion: "follow", role: props.role ?? 'group', "aria-label": label, tabIndex: -1, "data-lab-dock": true, children: _jsx("div", { ref: measured.body, className: "lab-dock-body", style: measured.bodyStyle, children: _jsx(ActionsWidthProvider, { value: measured.actionsMaxWidth, children: _jsx(DockContentSwap, { swapKey: swapKey, children: _jsxs("div", { className: "lab-dock-row", children: [content && _jsx("div", { className: "lab-dock-content", children: content }), _jsx("div", { className: "lab-dock-actions", children: children })] }) }) }) }) }) }));
});
//# sourceMappingURL=dock.js.map