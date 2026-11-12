'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { InPlaceSheet } from './sheet.js';
import { useElementWidth } from './adaptive.js';
import { allocatePanelWidths, closePanel, pushPanel, replacePanel, panelResizeBounds, resizePanelPair } from './panel-model.js';
import { ResizeDivider } from './resize-divider.js';
import { createResizeDrag } from './resize-drag.js';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import { useShellGap } from '../scroll/shell-gap.js';
import './panel.css';
const StackContext = React.createContext(null);
const SurfaceContext = React.createContext(null);
/** Access the nearest host's controlled navigation requests. Not business or routing state. */
export function usePanelStack() {
    const value = React.useContext(StackContext);
    if (!value)
        throw new Error('usePanelStack requires a PanelHost');
    return value;
}
/** Opaque, bounded scrolling surface; inside a host its very same Sheet tree becomes a column. */
export function Panel({ onClose, ...props }) {
    const surface = React.useContext(SurfaceContext);
    const close = surface ? surface.close : onClose;
    return _jsx(InPlaceSheet, { ...props, open: true, onOpenChange: () => close?.(), showClose: !!close && props.showClose !== false, regular: "sheet", recede: false, detents: ['large'], grabber: false, inPlace: { sheet: surface?.sheet ?? false, hidden: surface?.hidden } });
}
/**
 * One coordinator for any depth: newest fitting desktop columns, stacked compact Sheets.
 * All entries stay mounted under identical parents. Only explicit removal resets child state.
 * Native dialog top-layer promotion changes presentation without a portal or second content copy.
 */
export function PanelHost({ panels, onPanelsChange, resizable = true, widths: controlledWidths, defaultWidths = {}, onWidthsChange, breakpoint = 720, gap, beforeClose, onCloseError, className, style }) {
    const { t } = useI18n();
    const [localWidths, setLocalWidths] = React.useState(defaultWidths);
    const preferences = controlledWidths ?? localWidths;
    const root = React.useRef(null);
    const width = useElementWidth(root);
    const themeGap = useShellGap(root);
    const [pending, setPending] = React.useState(false);
    const busy = React.useRef(false);
    const latest = React.useRef(panels);
    latest.current = panels;
    const request = async (next, reason) => {
        if (busy.current)
            return false;
        const snapshot = panels;
        const removed = snapshot.filter(p => !next.some(n => n.id === p.id)).reverse();
        if (removed.length && beforeClose) {
            busy.current = true;
            setPending(true);
            try {
                if (!await beforeClose(removed, reason) || latest.current !== snapshot)
                    return false;
            }
            catch (error) {
                onCloseError?.(error);
                return false;
            }
            finally {
                busy.current = false;
                setPending(false);
            }
        }
        onPanelsChange(next);
        return true;
    };
    const stack = {
        panels, pending,
        push: (panel, after) => request(pushPanel(panels, panel, after), 'push'),
        replace: (panel, id) => request(replacePanel(panels, panel, id), 'replace'),
        close: id => id === panels[0]?.id || !panels.some(p => p.id === id)
            ? Promise.resolve(false) : request(closePanel(panels, id), 'close'),
    };
    const compact = width !== null && width < breakpoint;
    const spacing = gap ?? themeGap;
    const columns = allocatePanelWidths(panels, width ?? 0, spacing, preferences);
    const defaults = allocatePanelWidths(panels, width ?? 0, spacing, defaultWidths);
    const widths = new Map(columns.map(p => [p.id, p.width]));
    const drag = React.useRef(null);
    // Any authoritative geometry/controlled navigation change invalidates the captured pair.
    // This also clears pending frames on breakpoint changes and unmount, before they can repaint.
    const geometry = JSON.stringify(columns);
    React.useLayoutEffect(() => () => {
        drag.current?.finish(true);
        drag.current = null;
    }, [panels, controlledWidths, width, spacing, compact, resizable, geometry]);
    // animation_level: 1. Direct manipulation snaps to feasible geometry; no easing or idle loop.
    const resize = (first, second, total, requested) => {
        const pair = resizePanelPair(first, second, total, requested);
        // Snapshot the other visible widths too: changing preference priority must not redistribute siblings.
        const next = { ...preferences, ...Object.fromEntries([...columns, ...pair].map(p => [p.id, p.width])) };
        if (controlledWidths === undefined)
            setLocalWidths(next);
        onWidthsChange?.(next);
    };
    const dividers = compact || !resizable ? [] : columns.slice(0, -1).map((column, index) => {
        const next = columns[index + 1];
        const first = panels.find(p => p.id === column.id), second = panels.find(p => p.id === next.id);
        const total = column.width + next.width;
        const bounds = panelResizeBounds(first, second, total);
        const offset = columns.slice(0, index + 1).reduce((sum, p) => sum + p.width, 0) + spacing * index;
        return _jsx(ResizeDivider, { className: "lab-panel-divider", label: t('lab.panel.resize'), value: column.width, min: bounds.min, max: bounds.max, reset: defaults.find(p => p.id === column.id)?.width ?? column.width, style: { '--lab-panel-divider-offset': `${offset + spacing / 2}px` }, onChange: value => {
                drag.current?.finish(true);
                drag.current = null;
                resize(first, second, total, value);
            }, onDragStart: () => {
                drag.current?.finish(true);
                const host = root.current;
                // Cache nodes once. Frames only write CSS; they never measure,
                // allocate the whole chain, notify persistence, or rebuild Stack/Surface contexts.
                const slots = Array.from(host.children).filter((el) => el instanceof HTMLElement && el.classList.contains('lab-panel-slot'));
                const a = slots.find(el => el.dataset.panelId === first.id);
                const b = slots.find(el => el.dataset.panelId === second.id);
                const dividers = Array.from(host.children).filter((el) => el instanceof HTMLElement && el.classList.contains('lab-panel-divider'));
                const divider = dividers[index];
                const aria = divider.getAttribute('aria-valuenow');
                host.setAttribute('data-resizing', '');
                drag.current = createResizeDrag({
                    paint: requested => {
                        const [left, right] = resizePanelPair(first, second, total, requested);
                        a.style.setProperty('--lab-panel-drag-width', `${left.width}px`);
                        b.style.setProperty('--lab-panel-drag-width', `${right.width}px`);
                        divider.style.setProperty('--lab-panel-drag-offset', `${offset + spacing / 2 + left.width - column.width}px`);
                        divider.setAttribute('aria-valuenow', String(left.width));
                    },
                    restore: () => {
                        a.style.removeProperty('--lab-panel-drag-width');
                        b.style.removeProperty('--lab-panel-drag-width');
                        divider.style.removeProperty('--lab-panel-drag-offset');
                        divider.setAttribute('aria-valuenow', divider.getAttribute('data-resize-value') ?? aria);
                        divider.removeAttribute('data-resizing');
                        host.removeAttribute('data-resizing');
                    },
                    commit: requested => resize(first, second, total, requested),
                });
                return column.width;
            }, onDragMove: value => drag.current?.move(value), onDragEnd: ({ cancelled }) => {
                drag.current?.finish(cancelled);
                drag.current = null;
            } }, JSON.stringify([column.id, next.id]));
    });
    return (_jsx(StackContext.Provider, { value: stack, children: _jsxs("div", { ref: root, className: cn('lab-panel-host', className), style: { ...style, ...(gap === undefined ? {} : { gap }) }, "data-compact": compact || undefined, "aria-busy": pending || undefined, children: [panels.map((entry, index) => {
                    const sheet = compact && index > 0;
                    const hidden = !compact && width !== null && !widths.has(entry.id);
                    return _jsx("div", { className: "lab-panel-slot", hidden: hidden, inert: hidden || undefined, "data-sheet": sheet || undefined, "data-panel-id": entry.id, style: { '--lab-panel-width': compact ? '100%' : `${widths.get(entry.id) ?? 0}px` }, children: _jsx(SurfaceContext.Provider, { value: { sheet, hidden, close: index === 0 ? undefined : () => { void stack.close(entry.id); } }, children: entry.panel }) }, entry.id);
                }), dividers] }) }));
}
/** Alias for PanelHost when naming the complete controlled chain rather than its layout role. */
export const PanelStack = PanelHost;
//# sourceMappingURL=panel-host.js.map