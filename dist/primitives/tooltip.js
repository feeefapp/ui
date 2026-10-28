'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { useFloatingBoundary } from '../menu/boundary.js';
import './tooltip.css';
/**
 * Groups tooltips so moving from one control to the next skips the hover delay. Put one around a
 * toolbar or a screen; `ActionsBar` brings its own.
 */
export function TooltipProvider({ children }) {
    return (_jsx(RadixTooltip.Provider, { delayDuration: 350, skipDelayDuration: 300, children: children }));
}
/**
 * The kit tooltip: a small opaque label shown on hover and keyboard focus, never on touch taps.
 * Needs a `TooltipProvider` above it. The control keeps its own `aria-label`; the tooltip is a
 * visual echo of it, so don't put information only here.
 */
export function Tooltip({ text, shortcut, side = 'bottom', children }) {
    const boundary = useFloatingBoundary();
    if (!text)
        return children;
    return (_jsxs(RadixTooltip.Root, { children: [_jsx(RadixTooltip.Trigger, { asChild: true, children: children }), _jsx(RadixTooltip.Portal, { container: boundary ?? undefined, children: _jsxs(RadixTooltip.Content, { className: "lab-tooltip", side: side, sideOffset: 8, collisionPadding: 12, collisionBoundary: boundary ?? undefined, children: [text, shortcut && _jsx("kbd", { className: "lab-tooltip-shortcut", children: shortcut })] }) })] }));
}
//# sourceMappingURL=tooltip.js.map