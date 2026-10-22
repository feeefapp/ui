'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { LabGlassGroup } from '../scaffold.js';
import { animateLayoutFrom, snapshotLayout } from '../physics/layout-group.js';
import { LabMotionValue, prefersReducedMotion } from '../physics/motion-value.js';
import { LAB_SPRINGS, springTiming } from '../physics/spring.js';
import { cn } from '../utils.js';
import './tab-view.css';
const SNAPPY = springTiming(LAB_SPRINGS.snappy);
/**
 * App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
 * tab bar switches between them, and while the person scrolls down it shrinks to the selected
 * tab so content gets the screen. Picking the current tab again returns it to the top.
 */
export function LabTabView({ tabs, value, onChange, onReselect, minimize = 'scroll', accessory, label = 'Tabs', className, }) {
    const id = React.useId();
    const root = React.useRef(null);
    const bar = React.useRef(null);
    const chrome = React.useRef(null);
    const panels = React.useRef(new Map());
    const [minimized, setMinimized] = React.useState(false);
    const [visited, setVisited] = React.useState(() => new Set([value]));
    if (!visited.has(value))
        setVisited(new Set(visited).add(value));
    const pending = React.useRef(null);
    // The bar's own height becomes extra bottom space for every scroll area inside the tabs.
    React.useLayoutEffect(() => {
        const el = chrome.current, host = root.current;
        if (!el || !host)
            return;
        // Measured only while full: shrinking the reserve would clamp scroll positions and read as a
        // scroll up, expanding the bar again.
        const measure = () => {
            if (!el.hasAttribute('data-minimized'))
                host.style.setProperty('--lab-tab-chrome', `${el.offsetHeight}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [Boolean(accessory)]);
    /** Minimizing morphs the chrome: snapshot the pieces, change state, spring them to their new place. */
    const setMinimizedMorph = (next) => {
        if (next === minimized)
            return;
        const pieces = chrome.current?.querySelectorAll('[data-lab-tab-piece]');
        pending.current = pieces ? snapshotLayout(pieces) : null;
        setMinimized(next);
    };
    React.useLayoutEffect(() => {
        if (pending.current)
            animateLayoutFrom(pending.current, { spring: LAB_SPRINGS.snappy });
        pending.current = null;
    }, [minimized]);
    // Shrink while the person reads down; come back when they scroll up or reach the top.
    const live = React.useRef({ minimized, minimize, value });
    live.current = { minimized, minimize, value };
    React.useEffect(() => {
        const host = root.current;
        if (!host)
            return;
        const last = new WeakMap();
        const onScroll = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement) || live.current.minimize !== 'scroll')
                return;
            const panel = panels.current.get(live.current.value);
            if (!panel?.contains(target))
                return;
            const top = target.scrollTop;
            const previous = last.get(target) ?? 0;
            last.set(target, top);
            if (top < 24)
                setMinimizedMorphRef.current(false);
            else if (top - previous > 6)
                setMinimizedMorphRef.current(true);
            else if (previous - top > 10)
                setMinimizedMorphRef.current(false);
        };
        host.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => host.removeEventListener('scroll', onScroll, { capture: true });
    }, []);
    const setMinimizedMorphRef = React.useRef(setMinimizedMorph);
    setMinimizedMorphRef.current = setMinimizedMorph;
    // A switched-to panel fades in quickly; it never slides (tabs are siblings, not depth).
    const fade = React.useRef(new LabMotionValue(1, 0.004)).current;
    const previous = React.useRef(value);
    React.useLayoutEffect(() => {
        if (previous.current === value)
            return;
        previous.current = value;
        const panel = panels.current.get(value);
        if (!panel || prefersReducedMotion())
            return;
        const unsubscribe = fade.subscribe((v) => (panel.style.opacity = String(v)));
        fade.set(0);
        void fade.animateTo(1, { spring: { duration: 0.22, bounce: 0 } }).then(() => {
            unsubscribe();
            panel.style.opacity = '';
        });
        return unsubscribe;
    }, [value]);
    const pick = (tab) => {
        if (tab.id === value) {
            setMinimizedMorph(false);
            if (onReselect)
                onReselect(tab.id);
            else
                panels.current
                    .get(tab.id)
                    ?.querySelector('.lab-scroll-viewport')
                    ?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
            return;
        }
        setMinimizedMorph(false);
        onChange(tab.id);
    };
    const onKeyDown = (event) => {
        const index = tabs.findIndex((t) => t.id === value);
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
        const keys = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
        let next = -1;
        if (event.key in keys)
            next = (index + keys[event.key] + tabs.length) % tabs.length;
        else if (event.key === 'Home')
            next = 0;
        else if (event.key === 'End')
            next = tabs.length - 1;
        if (next < 0)
            return;
        event.preventDefault();
        onChange(tabs[next].id);
        bar.current?.querySelectorAll('[role="tab"]')[next]?.focus();
    };
    return (_jsxs("div", { ref: root, className: cn('lab-tab-view', className), style: { '--lab-tab-ease': SNAPPY.easing, '--lab-tab-duration': `${SNAPPY.duration}ms` }, children: [tabs.map((tab) => visited.has(tab.id) ? (_jsx("div", { ref: (el) => {
                    if (el)
                        panels.current.set(tab.id, el);
                    else
                        panels.current.delete(tab.id);
                }, id: `${id}-panel-${tab.id}`, role: "tabpanel", "aria-labelledby": `${id}-tab-${tab.id}`, className: "lab-tab-panel", "data-active": tab.id === value || undefined, inert: tab.id !== value || undefined, children: tab.content }, tab.id)) : null), _jsxs("div", { ref: chrome, className: "lab-tab-chrome", "data-minimized": minimized || undefined, children: [accessory && (_jsx(LabGlassGroup, { className: "lab-tab-accessory", "data-lab-tab-piece": "", children: accessory })), _jsx(LabGlassGroup, { ref: bar, className: "lab-tab-bar", role: "tablist", "aria-label": label, "data-lab-tab-piece": "", onKeyDown: onKeyDown, onClick: () => minimized && setMinimizedMorph(false), children: tabs.map((tab) => {
                            const selected = tab.id === value;
                            return (_jsxs("button", { id: `${id}-tab-${tab.id}`, type: "button", role: "tab", className: "lab-tab", "aria-selected": selected, "aria-controls": `${id}-panel-${tab.id}`, tabIndex: selected ? 0 : -1, "data-selected": selected || undefined, onClick: (event) => {
                                    if (minimized) {
                                        event.stopPropagation();
                                        setMinimizedMorph(false);
                                        return;
                                    }
                                    pick(tab);
                                }, children: [_jsxs("span", { className: "lab-tab-icon", "aria-hidden": "true", children: [tab.icon, tab.badge !== undefined && tab.badge !== null && tab.badge !== false && (_jsx("span", { className: "lab-tab-badge", children: tab.badge }))] }), _jsx("span", { className: "lab-tab-label", children: tab.label }), (typeof tab.badge === 'string' || typeof tab.badge === 'number') && (_jsxs("span", { className: "lab-sr-only", children: [", ", tab.badge] }))] }, tab.id));
                        }) })] })] }));
}
//# sourceMappingURL=tab-view.js.map