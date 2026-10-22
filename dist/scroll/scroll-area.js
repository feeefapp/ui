'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useRef, useLayoutEffect, useState, useImperativeHandle, } from 'react';
import { cn } from '../utils.js';
import { ScrollGradientOverlay } from './gradient-overlay.js';
import { scrollContentReserve } from './metrics.js';
import './scroll.css';
/**
 * Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes. Fills its
 * parent, which must have a bounded height. The forwarded ref points at the scrolling element.
 */
export const ScrollArea = forwardRef(function ScrollArea({ children, top, bottom, label, edgeGap = 12, contentPadding = 24, gradient = true, topFadeHeight, bottomFadeHeight, viewportProps, className, style, ...props }, ref) {
    const viewport = useRef(null);
    const topRef = useRef(null), bottomRef = useRef(null);
    const [heights, setHeights] = useState({ top: 0, bottom: 0 });
    useImperativeHandle(ref, () => viewport.current, []);
    useLayoutEffect(() => {
        const measure = () => {
            const next = {
                top: topRef.current?.offsetHeight ?? 0,
                bottom: bottomRef.current?.offsetHeight ?? 0,
            };
            setHeights((previous) => previous.top === next.top && previous.bottom === next.bottom ? previous : next);
        };
        const resize = new ResizeObserver(measure);
        if (topRef.current)
            resize.observe(topRef.current);
        if (bottomRef.current)
            resize.observe(bottomRef.current);
        measure();
        return () => resize.disconnect();
    }, [Boolean(top), Boolean(bottom)]);
    return (_jsxs("div", { ...props, className: cn('lab-scroll-area', className), style: {
            ...style,
            '--lab-scroll-gap': `${Math.max(0, edgeGap)}px`,
            '--lab-scroll-padding': `${Math.max(0, contentPadding)}px`,
            '--lab-scroll-top-reserve': `${scrollContentReserve(heights.top, edgeGap, contentPadding)}px`,
            '--lab-scroll-bottom-reserve': `${scrollContentReserve(heights.bottom, edgeGap, contentPadding)}px`,
        }, children: [top && (_jsx("div", { ref: topRef, className: "lab-scroll-float lab-scroll-float--top", children: top })), _jsx("div", { ...viewportProps, ref: viewport, className: cn('lab-scroll-viewport', viewportProps?.className), role: viewportProps?.role ?? 'region', "aria-label": viewportProps?.['aria-label'] ?? label, tabIndex: viewportProps?.tabIndex ?? 0, children: _jsx("div", { className: "lab-scroll-content", children: children }) }), gradient && (_jsx(ScrollGradientOverlay, { viewport: viewport, topHeight: topFadeHeight ?? Math.max(100, heights.top + edgeGap * 2), bottomHeight: bottomFadeHeight ?? Math.max(140, heights.bottom + edgeGap * 2) })), bottom && (_jsx("div", { ref: bottomRef, className: "lab-scroll-float lab-scroll-float--bottom", children: bottom }))] }));
});
//# sourceMappingURL=scroll-area.js.map