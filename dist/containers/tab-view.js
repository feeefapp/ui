'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { GlassGroup } from '../scaffold.js';
import { MotionValue, prefersReducedMotion } from '../physics/motion-value.js';
import { SelectionTrack } from '../primitives/selection-track.js';
import { cn } from '../utils.js';
import './tab-view.css';
import { GlassBar, GlassScope } from '../glass/container.js';
/**
 * App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
 * tab bar switches between them, and while the person scrolls down it shrinks to the selected
 * tab so content gets the screen. Picking the current tab again returns it to the top.
 *
 * The bar is a segmented control with tab semantics (the shared selection track): press the
 * selected tab and it becomes a glass lens you can drag across the tabs; the tab under it on
 * release is chosen. Tabs can carry a count (`badge`).
 */
export function TabView({ tabs, value, onChange, onReselect, minimize = 'scroll', accessory, label = 'Tabs', className, }) {
    const id = React.useId();
    const root = React.useRef(null);
    const chrome = React.useRef(null);
    const panels = React.useRef(new Map());
    const [minimized, setMinimized] = React.useState(false);
    const [visited, setVisited] = React.useState(() => new Set([value]));
    if (!visited.has(value))
        setVisited(new Set(visited).add(value));
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
    /** Minimizing changes the layout; the chrome's glass container springs the bubbles and their content. */
    const setMinimizedMorph = (next) => {
        if (next !== minimized)
            setMinimized(next);
    };
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
    const fade = React.useRef(new MotionValue(1, 0.004)).current;
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
    const reselect = (tabId) => {
        if (onReselect)
            onReselect(tabId);
        else
            panels.current
                .get(tabId)
                ?.querySelector('.lab-scroll-viewport')
                ?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    const select = (next, source) => {
        // Keys activate the tab they reach and leave the bar as it is.
        if (source === 'key')
            return onChange(next);
        // A press on the small bar only brings it back.
        if (minimized && source === 'press')
            return setMinimizedMorph(false);
        setMinimizedMorph(false);
        if (next === value)
            reselect(next);
        else
            onChange(next);
    };
    return (_jsxs("div", { ref: root, className: cn('lab-tab-view', className), children: [tabs.map((tab) => visited.has(tab.id) ? (_jsx("div", { ref: (el) => {
                    if (el)
                        panels.current.set(tab.id, el);
                    else
                        panels.current.delete(tab.id);
                }, id: `${id}-panel-${tab.id}`, role: "tabpanel", "aria-labelledby": `${id}-tab-${tab.id}`, className: "lab-tab-panel", "data-active": tab.id === value || undefined, inert: tab.id !== value || undefined, children: tab.content }, tab.id)) : null), _jsx(GlassBar, { children: _jsxs(GlassScope, { ref: chrome, className: "lab-tab-chrome", "data-minimized": minimized || undefined, children: [accessory && (_jsx(GlassGroup, { className: "lab-tab-accessory", "data-lab-tab-piece": "", glassId: "accessory", children: accessory })), _jsx(GlassGroup, { glassId: "tabs", className: "lab-tab-bar", "data-lab-tab-piece": "", onClick: () => minimized && setMinimizedMorph(false), children: _jsx(SelectionTrack, { semantics: "tab", layout: "stacked", pill: "tinted", className: "lab-tab-track", label: label, value: value, onSelect: select, draggable: !minimized, collapsed: minimized, options: tabs.map((tab) => ({
                                    value: tab.id,
                                    label: tab.label,
                                    icon: tab.icon,
                                    badge: tab.badge,
                                    id: `${id}-tab-${tab.id}`,
                                    controls: `${id}-panel-${tab.id}`,
                                })) }) })] }) })] }));
}
//# sourceMappingURL=tab-view.js.map