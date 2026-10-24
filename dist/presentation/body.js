'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { ScrollArea } from '../scroll/index.js';
import './presentation.css';
/**
 * The scrolling body of a presentation surface: a `ScrollArea` whose header and dock float over
 * the content. It is a flex item of its surface: it hugs the content plus the floating chrome,
 * shrinks to the height the surface allows (and then scrolls), or fills that height with `fill`.
 * The forwarded ref is the scrolling viewport.
 */
export const PresentationBody = React.forwardRef(function PresentationBody({ label, top, bottom, fill = false, edgeGap, contentPadding, onNaturalHeight, className, children }, ref) {
    const root = React.useRef(null);
    const body = React.useRef(null);
    const [natural, setNatural] = React.useState();
    const report = React.useRef(onNaturalHeight);
    report.current = onNaturalHeight;
    React.useLayoutEffect(() => {
        const element = body.current;
        const content = element?.parentElement;
        const area = root.current?.firstElementChild;
        if (!element || !content || !area)
            return;
        const measure = () => {
            const padding = getComputedStyle(content);
            const floats = Array.from(area.querySelectorAll(':scope > .lab-scroll-float'));
            // The floats alone, with their offsets, are the least a body can be.
            const chrome = floats.reduce((sum, float) => {
                const style = getComputedStyle(float);
                const offset = float.classList.contains('lab-scroll-float--top') ? style.top : style.bottom;
                return sum + float.offsetHeight + (parseFloat(offset) || 0);
            }, 0);
            const next = Math.ceil(Math.max(chrome, element.offsetHeight + parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom)));
            setNatural((previous) => (previous === next ? previous : next));
            report.current?.(next);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        // Border box: the floats' reservations are padding, which changes without the body resizing.
        observer.observe(content, { box: 'border-box' });
        area.querySelectorAll(':scope > .lab-scroll-float').forEach((float) => observer.observe(float));
        measure();
        return () => observer.disconnect();
    }, [top != null, bottom != null]);
    return (_jsx("div", { ref: root, className: cn('lab-presentation-body', className), "data-fill": fill || undefined, style: !fill && natural !== undefined ? { blockSize: natural } : undefined, children: _jsx(ScrollArea, { ref: ref, className: "lab-presentation-scroll", label: label, top: top ?? undefined, bottom: bottom ?? undefined, edgeGap: edgeGap, contentPadding: contentPadding, children: _jsx("div", { ref: body, className: "lab-presentation-content", children: children }) }) }));
});
//# sourceMappingURL=body.js.map