'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ResizeDivider } from './resize-divider.js';
import { useI18n } from '../i18n.js';
import { createResizeDrag } from './resize-drag.js';
import { NavigationStack } from './navigation-stack.js';
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
export function SplitView({ list, detail, placeholder, onBack, listWidth: controlledWidth, defaultListWidth = 360, onListWidthChange, minListWidth = 280, maxListWidth = 520, resizable = true, compactBreakpoint = 720, label = 'List and detail', className, }) {
    const { t } = useI18n();
    const root = React.useRef(null);
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
    const drag = React.useRef(null);
    React.useLayoutEffect(() => () => {
        drag.current?.finish(true);
        drag.current = null;
    }, [width, controlledWidth, hostWidth, compact, minListWidth, maxListWidth, resizable]);
    const clamp = (next) => Math.max(minListWidth, Math.min(maxListWidth, next));
    const commit = (next) => {
        const clamped = clamp(next);
        if (controlledWidth === undefined)
            setLocalWidth(clamped);
        onListWidthChange?.(clamped);
    };
    // animation_level: 1. Frame-coalesced direct manipulation; no overshoot or release clock.
    const step = (next) => {
        drag.current?.finish(true);
        drag.current = null;
        commit(next);
    };
    if (compact)
        return (_jsx("div", { ref: root, className: cn('lab-split', className), "data-compact": "", role: "region", "aria-label": label, children: _jsx(NavigationStack, { label: label, onBack: onBack, children: [list, ...pages] }) }));
    return (_jsxs("div", { ref: root, className: cn('lab-split', className), role: "region", "aria-label": label, style: { '--lab-split-list': `${Math.round(width)}px` }, children: [_jsx("div", { className: "lab-split-list", children: list }), _jsx(ResizeDivider, { className: "lab-split-divider", label: t('lab.panel.resize'), value: Math.round(width), min: minListWidth, max: maxListWidth, reset: defaultListWidth, enabled: resizable, onChange: step, onDragStart: () => {
                    drag.current?.finish(true);
                    const host = root.current;
                    const divider = host.querySelector('.lab-split-divider');
                    const aria = divider.getAttribute('aria-valuenow');
                    host.setAttribute('data-resizing', '');
                    drag.current = createResizeDrag({
                        paint: raw => {
                            const value = clamp(raw);
                            host.style.setProperty('--lab-split-drag-list', `${value}px`);
                            divider.setAttribute('aria-valuenow', String(value));
                        },
                        restore: () => {
                            host.style.removeProperty('--lab-split-drag-list');
                            host.removeAttribute('data-resizing');
                            divider.setAttribute('aria-valuenow', divider.getAttribute('data-resize-value') ?? aria);
                            divider.removeAttribute('data-resizing');
                        },
                        commit,
                    });
                    return width;
                }, onDragMove: raw => drag.current?.move(raw), onDragEnd: ({ cancelled }) => {
                    drag.current?.finish(cancelled);
                    drag.current = null;
                } }), _jsx("div", { className: "lab-split-detail", children: pages.length ? (_jsx(NavigationStack, { label: `${label}: detail`, onBack: onBack, children: pages })) : (placeholder) })] }));
}
/** Quiet centered message for an empty detail column. */
export function SplitPlaceholder({ icon, title, children, }) {
    return (_jsxs("div", { className: "lab-split-placeholder", children: [icon && _jsx("span", { className: "lab-split-placeholder-icon", children: icon }), _jsx("p", { className: "lab-split-placeholder-title", children: title }), children && _jsx("div", { className: "lab-split-placeholder-body", children: children })] }));
}
//# sourceMappingURL=split-view.js.map