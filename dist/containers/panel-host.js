'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { InPlaceSheet } from './sheet.js';
import { useElementWidth } from './adaptive.js';
import { allocatePanelWidths, closePanel, pushPanel, replacePanel } from './panel-model.js';
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
export function PanelHost({ panels, onPanelsChange, breakpoint = 720, gap, beforeClose, onCloseError, className, style }) {
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
    const columns = allocatePanelWidths(panels, width ?? 0, gap ?? themeGap);
    const widths = new Map(columns.map(p => [p.id, p.width]));
    return (_jsx(StackContext.Provider, { value: stack, children: _jsx("div", { ref: root, className: cn('lab-panel-host', className), style: { ...style, ...(gap === undefined ? {} : { gap }) }, "data-compact": compact || undefined, "aria-busy": pending || undefined, children: panels.map((entry, index) => {
                const sheet = compact && index > 0;
                const hidden = !compact && width !== null && !widths.has(entry.id);
                return _jsx("div", { className: "lab-panel-slot", hidden: hidden, inert: hidden || undefined, "data-sheet": sheet || undefined, "data-panel-id": entry.id, style: { width: compact ? '100%' : widths.get(entry.id) ?? 0 }, children: _jsx(SurfaceContext.Provider, { value: { sheet, hidden, close: index === 0 ? undefined : () => { void stack.close(entry.id); } }, children: entry.panel }) }, entry.id);
            }) }) }));
}
/** Alias for PanelHost when naming the complete controlled chain rather than its layout role. */
export const PanelStack = PanelHost;
//# sourceMappingURL=panel-host.js.map