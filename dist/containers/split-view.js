'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { attachPan } from '../physics/gesture.js';
import { LabMotionValue } from '../physics/motion-value.js';
import { LAB_SPRINGS, rubberBandClamp } from '../physics/spring.js';
import { LabNavigationStack } from './navigation-stack.js';
import { cn } from '../utils.js';
import './split-view.css';
/** Collects keyed page elements from `detail` (an element, an array or a fragment). */
function detailPages(detail) {
    const pages = [];
    const walk = (node) => React.Children.forEach(node, (child) => {
        if (!React.isValidElement(child))
            return;
        if (child.type === React.Fragment)
            walk(child.props.children);
        else
            pages.push(child);
    });
    walk(detail);
    return pages;
}
/**
 * A list beside its detail, like Mail on iPad: two columns with a resizable divider on wide
 * screens, collapsing into one navigation stack (list → detail, swipe back) on narrow ones. The
 * same pages render in both, so a phone and a desktop share one implementation.
 */
export function LabSplitView({ list, detail, placeholder, onBack, listWidth: controlledWidth, defaultListWidth = 360, onListWidthChange, minListWidth = 280, maxListWidth = 520, resizable = true, compactBreakpoint = 720, label = 'List and detail', className, }) {
    const root = React.useRef(null);
    const divider = React.useRef(null);
    const [hostWidth, setHostWidth] = React.useState(null);
    const [localWidth, setLocalWidth] = React.useState(defaultListWidth);
    const width = controlledWidth ?? localWidth;
    const pages = detailPages(detail);
    const compact = hostWidth !== null && hostWidth < compactBreakpoint;
    React.useLayoutEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const measure = () => setHostWidth(el.clientWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    // The column width is a motion value: dragging tracks it, release springs it into bounds.
    const motion = React.useRef(null);
    if (!motion.current)
        motion.current = new LabMotionValue(width, 0.5);
    const live = React.useRef({ width, minListWidth, maxListWidth, onListWidthChange, controlledWidth });
    live.current = { width, minListWidth, maxListWidth, onListWidthChange, controlledWidth };
    const paint = React.useCallback((value) => {
        root.current?.style.setProperty('--lab-split-list', `${Math.round(value)}px`);
    }, []);
    React.useLayoutEffect(() => motion.current.subscribe(paint), [paint]);
    React.useLayoutEffect(() => {
        if (!motion.current.isAnimating()) {
            motion.current.set(width);
            paint(width);
        }
    }, [width, compact, paint]);
    const commit = React.useCallback((next) => {
        const L = live.current;
        const clamped = Math.round(Math.max(L.minListWidth, Math.min(L.maxListWidth, next)));
        if (L.controlledWidth === undefined)
            setLocalWidth(clamped);
        L.onListWidthChange?.(clamped);
        return clamped;
    }, []);
    React.useEffect(() => {
        const el = divider.current;
        if (!el || !resizable || compact)
            return;
        let start = 0;
        return attachPan(el, () => ({
            axis: 'x',
            threshold: 1,
            onStart: () => {
                motion.current.stop();
                start = motion.current.get();
                root.current?.setAttribute('data-resizing', '');
            },
            onMove: ({ dx, time }) => {
                const L = live.current;
                const rtl = getComputedStyle(root.current).direction === 'rtl';
                const raw = start + (rtl ? -dx : dx);
                motion.current.track(rubberBandClamp(raw, L.minListWidth, L.maxListWidth, 240), time);
            },
            onEnd: ({ time }) => {
                root.current?.removeAttribute('data-resizing');
                const velocity = motion.current.getVelocity(time);
                const target = commit(motion.current.get());
                void motion.current.animateTo(target, { spring: LAB_SPRINGS.release, velocity });
            },
        }));
    }, [resizable, compact, commit]);
    const step = (delta) => {
        const target = commit(width + delta);
        void motion.current.animateTo(target, { spring: LAB_SPRINGS.snappy });
    };
    if (compact)
        return (_jsx("div", { ref: root, className: cn('lab-split', className), "data-compact": "", role: "region", "aria-label": label, children: _jsx(LabNavigationStack, { label: label, onBack: onBack, children: [list, ...pages] }) }));
    return (_jsxs("div", { ref: root, className: cn('lab-split', className), role: "region", "aria-label": label, style: { '--lab-split-list': `${Math.round(width)}px` }, children: [_jsx("div", { className: "lab-split-list", children: list }), _jsx("div", { ref: divider, className: "lab-split-divider", role: "separator", "aria-orientation": "vertical", "aria-label": "Resize the list", "aria-valuenow": Math.round(width), "aria-valuemin": minListWidth, "aria-valuemax": maxListWidth, tabIndex: resizable ? 0 : undefined, "data-resizable": resizable || undefined, onDoubleClick: () => resizable && step(defaultListWidth - width), onKeyDown: (event) => {
                    if (!resizable)
                        return;
                    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
                    const toward = (key) => (key === 'ArrowRight') !== rtl;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
                        step(toward(event.key) ? 24 : -24);
                    else if (event.key === 'Home')
                        step(minListWidth - width);
                    else if (event.key === 'End')
                        step(maxListWidth - width);
                    else
                        return;
                    event.preventDefault();
                } }), _jsx("div", { className: "lab-split-detail", children: pages.length ? (_jsx(LabNavigationStack, { label: `${label}: detail`, onBack: onBack, children: pages })) : (placeholder) })] }));
}
/** Quiet centered message for an empty detail column. */
export function LabSplitPlaceholder({ icon, title, children, }) {
    return (_jsxs("div", { className: "lab-split-placeholder", children: [icon && _jsx("span", { className: "lab-split-placeholder-icon", children: icon }), _jsx("p", { className: "lab-split-placeholder-title", children: title }), children && _jsx("div", { className: "lab-split-placeholder-body", children: children })] }));
}
//# sourceMappingURL=split-view.js.map