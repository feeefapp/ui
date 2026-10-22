'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import './motion.css';
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/**
 * Keeps an element mounted while it animates out. `state` drives `data-state`
 * so CSS owns the motion; the timer is the source of truth for unmounting.
 */
export function usePresence(open, exitMs = 200) {
    const [mounted, setMounted] = React.useState(open);
    const [state, setState] = React.useState(open ? 'open' : 'closed');
    React.useEffect(() => {
        if (open) {
            setMounted(true);
            setState('open');
            return;
        }
        if (!mounted)
            return;
        setState('closed');
        const timer = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : exitMs);
        return () => clearTimeout(timer);
    }, [open]);
    return { mounted, state };
}
/** Renders the last children while closing so exit frames never flash new content. */
export function useLatched(value, hold) {
    const latched = React.useRef(value);
    if (hold)
        latched.current = value;
    return latched.current;
}
/**
 * Label that swaps between known values without changing width: every option
 * is laid out in the same grid cell and only the active one is visible.
 */
export function StableText({ value, options, className, }) {
    const all = options.includes(value) ? options : [...options, value];
    return (_jsx("span", { className: `lab-stable-text ${className || ''}`, children: all.map((option) => (_jsx("span", { "data-active": option === value || undefined, "aria-hidden": option !== value, children: option }, option))) }));
}
/**
 * Animates its own height to follow its content, so content that appears,
 * disappears or grows (results, errors, previews) eases instead of jumping.
 */
export function AutoHeight({ children, className, as: Component = 'div', ...props }) {
    const inner = React.useRef(null);
    const [height, setHeight] = React.useState(null);
    React.useLayoutEffect(() => {
        const element = inner.current;
        if (!element || typeof ResizeObserver === 'undefined')
            return;
        // The height goes on the outer box: under `box-sizing: border-box` it has to include that
        // box's own border and padding, or a bordered AutoHeight ends short of its content.
        const measure = () => {
            const outer = element.parentElement;
            let frame = 0;
            if (outer) {
                const css = getComputedStyle(outer);
                if (css.boxSizing === 'border-box') {
                    frame =
                        parseFloat(css.borderTopWidth) +
                            parseFloat(css.borderBottomWidth) +
                            parseFloat(css.paddingTop) +
                            parseFloat(css.paddingBottom);
                }
            }
            setHeight(element.offsetHeight + (frame || 0));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        return () => observer.disconnect();
    }, []);
    return (_jsx(Component, { ...props, className: `lab-auto-height ${className || ''}`, style: { ...props.style, height: height === null ? undefined : height }, children: _jsx("div", { ref: inner, className: "lab-auto-height-inner", children: children }) }));
}
/** Mounts `render` while open and through its exit, with the last open output frozen. */
export function Presence({ open, exitMs = 160, render, }) {
    const { mounted, state } = usePresence(open, exitMs);
    const live = open ? render('open') : null;
    const node = useLatched(live, open);
    if (!open && !mounted)
        return null;
    return _jsx(_Fragment, { children: open ? live : React.isValidElement(node) ? withState(node, state) : node });
}
function withState(node, state) {
    return React.cloneElement(node, { 'data-state': state });
}
/**
 * Cross-fades between keyed icons in one fixed-size cell, so play/pause,
 * mic/stop and similar swaps animate without moving surrounding layout.
 */
export function Swap({ swapKey, children, className, }) {
    const previous = React.useRef({ key: swapKey, node: children });
    const [leaving, setLeaving] = React.useState([]);
    const timers = React.useRef(new Set());
    React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
    React.useLayoutEffect(() => {
        const last = previous.current;
        previous.current = { key: swapKey, node: children };
        if (last.key === swapKey)
            return;
        setLeaving((old) => [
            ...old.filter((item) => item.key !== swapKey && item.key !== last.key),
            last,
        ]);
        const timer = window.setTimeout(() => {
            timers.current.delete(timer);
            setLeaving((old) => old.filter((item) => item !== last));
        }, reducedMotion() ? 0 : 220);
        timers.current.add(timer);
    }, [swapKey]);
    // Keep the snapshot fresh for same-key updates without re-rendering.
    if (previous.current.key === swapKey)
        previous.current.node = children;
    return (_jsxs("span", { className: `lab-swap ${className || ''}`, "aria-hidden": "true", children: [leaving.map((item) => (_jsx("span", { className: "lab-swap-item", "data-state": "out", children: item.node }, item.key))), _jsx("span", { className: "lab-swap-item", "data-state": "in", children: children }, swapKey)] }));
}
//# sourceMappingURL=motion.js.map