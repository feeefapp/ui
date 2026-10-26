'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { GlassGroup } from '../scaffold.js';
import { MotionValue, prefersReducedMotion } from '../physics/motion-value.js';
import { SelectionTrack } from '../primitives/selection-track.js';
import { cn } from '../utils.js';
import './tab-view.css';
import { GlassBar, GlassScope } from '../glass/container.js';
import { GlassContext } from '../glass/context.js';
import { SPRINGS } from '../physics/spring.js';
import { minimizeGeometry, minimizeProgress } from './tab-view-minimize.js';
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
            if (progress.get() === 0)
                host.style.setProperty('--lab-tab-chrome', `${el.offsetHeight}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [Boolean(accessory)]);
    // Minimizing is one progress value, 0 (full bar, accessory above) to 1 (the selected tab as a
    // bubble with the accessory beside it). Scrolling moves it directly, so the morph follows the
    // finger and reverses with it; when scrolling stops it settles on the nearer end. Every frame
    // writes positions from boxes measured at rest (tab-view-minimize.ts) and asks the chrome's
    // glass container to re-measure, so the material tracks the bubbles exactly.
    const progress = React.useRef(new MotionValue(0, 0.001)).current;
    const glass = React.useRef(null);
    const boxes = React.useRef(null);
    const measureBoxes = () => {
        const el = chrome.current;
        const bar = el?.querySelector('.lab-tab-bar');
        const option = bar?.querySelector('.lab-segmented-option[data-selected]');
        if (!el || !bar || !option)
            return null;
        const rect = (node) => node.getBoundingClientRect();
        const c = rect(el);
        const local = (node) => {
            const r = rect(node);
            return { x: r.left - c.left, y: r.top - c.top, width: r.width, height: r.height };
        };
        const accessoryEl = el.querySelector('.lab-tab-accessory');
        const icon = option.querySelector('.lab-segmented-content:not(.lab-segmented-ink) .lab-segmented-icon');
        const o = local(option);
        const i = icon ? local(icon) : o;
        return {
            chrome: { x: 0, y: 0, width: c.width, height: c.height },
            bar: local(bar),
            track: bar.querySelector('.lab-segmented')?.getBoundingClientRect().width ?? local(bar).width,
            option: o,
            icon: { dx: o.x + o.width / 2 - (i.x + i.width / 2), dy: o.y + o.height / 2 - (i.y + i.height / 2) },
            accessory: accessoryEl ? local(accessoryEl) : null,
            gap: parseFloat(getComputedStyle(el).rowGap) || 0,
            rtl: getComputedStyle(el).direction === 'rtl',
        };
    };
    const paint = (p) => {
        const el = chrome.current;
        if (!el)
            return;
        const bar = el.querySelector('.lab-tab-bar');
        const accessoryEl = el.querySelector('.lab-tab-accessory');
        const track = el.querySelector('.lab-segmented-track');
        const scroller = el.querySelector('.lab-segmented');
        if (!bar)
            return;
        const pieces = [bar, accessoryEl].filter(Boolean);
        if (p <= 0) {
            el.style.height = '';
            el.removeAttribute('data-minimizing');
            for (const name of ['--lab-tab-minimize', '--lab-tab-icon-x', '--lab-tab-icon-y'])
                el.style.removeProperty(name);
            for (const piece of pieces)
                for (const key of ['position', 'left', 'top', 'width', 'height', 'margin'])
                    piece.style[key] = '';
            if (track) {
                track.style.transform = '';
                track.style.width = '';
            }
            if (scroller)
                scroller.style.width = '';
            boxes.current = null;
            glass.current?.requestMeasure();
            return;
        }
        const at = (boxes.current ??= measureBoxes());
        if (!at)
            return;
        const g = minimizeGeometry(at, p);
        el.style.height = `${at.chrome.height}px`;
        el.setAttribute('data-minimizing', '');
        el.style.setProperty('--lab-tab-minimize', String(p));
        el.style.setProperty('--lab-tab-icon-x', `${g.icon.dx}px`);
        el.style.setProperty('--lab-tab-icon-y', `${g.icon.dy}px`);
        const place = (piece, box) => {
            piece.style.position = 'absolute';
            piece.style.margin = '0';
            piece.style.left = `${box.x}px`;
            piece.style.top = `${box.y}px`;
            piece.style.width = `${box.width}px`;
            if (box.height !== undefined)
                piece.style.height = `${box.height}px`;
        };
        place(bar, g.bar);
        if (accessoryEl && g.accessory)
            place(accessoryEl, g.accessory);
        // The tabs keep their resting widths (equal-width tabs would otherwise shrink with the bar):
        // the bar clips them as it narrows.
        if (scroller)
            scroller.style.width = `${at.track}px`;
        if (track)
            track.style.transform = `translate(${g.trackShift.x}px, ${g.trackShift.y}px)`;
        glass.current?.requestMeasure();
    };
    React.useEffect(() => progress.subscribe(paint), []);
    const live = React.useRef({ minimized, minimize, value });
    live.current = { minimized, minimize, value };
    const showMinimized = (next) => {
        if (next !== live.current.minimized)
            setMinimized(next);
    };
    /** Spring to one end (a tap on the small bar, a tab change, scrolling stopped halfway). */
    const settle = (to) => {
        showMinimized(to === 1);
        if (prefersReducedMotion()) {
            progress.stop();
            progress.set(to);
            return;
        }
        void progress.animateTo(to, { spring: SPRINGS.snappy });
    };
    // Scrolling the visible tab drives the progress: down shrinks, up (or reaching the top) restores.
    React.useEffect(() => {
        const host = root.current;
        if (!host)
            return;
        const last = new WeakMap();
        let idle = 0;
        const onScroll = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement) || live.current.minimize !== 'scroll')
                return;
            const panel = panels.current.get(live.current.value);
            if (!panel?.contains(target))
                return;
            const top = target.scrollTop;
            const previous = last.get(target);
            last.set(target, top);
            if (previous === undefined)
                return;
            const next = minimizeProgress(progress.get(), top - previous, top);
            if (prefersReducedMotion()) {
                if (Math.round(next) !== Math.round(progress.get()))
                    settle(Math.round(next));
                else
                    progress.set(next);
                return;
            }
            progress.stop();
            progress.set(next);
            showMinimized(next >= 0.5);
            window.clearTimeout(idle);
            idle = window.setTimeout(() => {
                const p = progress.get();
                if (p > 0 && p < 1)
                    settle(p >= 0.5 ? 1 : 0);
            }, 140);
        };
        host.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => {
            window.clearTimeout(idle);
            host.removeEventListener('scroll', onScroll, { capture: true });
        };
    }, []);
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
            return settle(0);
        settle(0);
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
                }, id: `${id}-panel-${tab.id}`, role: "tabpanel", "aria-labelledby": `${id}-tab-${tab.id}`, className: "lab-tab-panel", "data-active": tab.id === value || undefined, inert: tab.id !== value || undefined, children: tab.content }, tab.id)) : null), _jsx(GlassBar, { children: _jsxs(GlassScope, { ref: chrome, className: "lab-tab-chrome", "data-minimized": minimized || undefined, children: [_jsx(GlassHandle, { handle: glass }), accessory && (_jsx(GlassGroup, { className: "lab-tab-accessory", "data-lab-tab-piece": "", glassId: "accessory", glassMotion: "follow", children: accessory })), _jsx(GlassGroup, { glassId: "tabs", style: { '--lab-tab-count': tabs.length }, glassMotion: "follow", className: "lab-tab-bar", "data-lab-tab-piece": "", onClick: () => minimized && settle(0), children: _jsx(SelectionTrack, { semantics: "tab", layout: "stacked", pill: "quiet", equalWidth: true, className: "lab-tab-track", label: label, value: value, onSelect: select, draggable: !minimized, options: tabs.map((tab) => ({
                                    value: tab.id,
                                    label: tab.label,
                                    icon: tab.icon,
                                    badge: tab.badge,
                                    id: `${id}-tab-${tab.id}`,
                                    controls: `${id}-panel-${tab.id}`,
                                })) }) })] }) })] }));
}
/** Hands the chrome's glass registry to TabView, which re-measures it on every minimize frame. */
function GlassHandle({ handle }) {
    handle.current = React.useContext(GlassContext);
    return null;
}
//# sourceMappingURL=tab-view.js.map