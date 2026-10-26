'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react';
import { PixelShader, PixelTexture } from '../pixel-art.js';
import { IconButton } from '../primitives/button.js';
import { ScrollArea } from '../scroll/index.js';
import { PresentationHost } from '../presentation/host.js';
import { usePresence } from '../motion.js';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import './scaffold.css';
import { GlassScope } from '../glass/container.js';
import { ToolbarOrientationContext } from '../toolbar.js';
import { LayoutGroup } from '../physics/layout-group.js';
const WorkspaceScaffoldContext = React.createContext(null);
/** Reads the nearest Scaffold's state. Throws outside a scaffold. */
export function useScaffold() {
    const context = React.useContext(WorkspaceScaffoldContext);
    if (!context)
        throw new Error('useScaffold requires Scaffold');
    return context;
}
/**
 * Workspace layout: optional top row, a sidebar (expanded, rail or hidden) and one rounded content
 * panel with floating app bar and bottom slots. Fills its parent's height. Below the compact
 * breakpoint the sidebar moves into a modal drawer. Provider owns theme, services and portals.
 */
export function Scaffold({ children, renderViewport, side, topSide, appBar, bottom, contentLabel = 'Workspace content', contentViewportRef, sideMode: controlledMode, defaultSideMode = 'expanded', onSideModeChange, compact: compactOverride, compactBreakpoint = 720, drawerLabel = 'Workspace navigation', drawerReturnFocusRef, className, style, dir, }) {
    const host = React.useRef(null);
    const main = React.useRef(null);
    const [localMode, setLocalMode] = React.useState(defaultSideMode);
    const [measuredCompact, setMeasuredCompact] = React.useState(false);
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const sideId = React.useId();
    const compact = compactOverride ?? measuredCompact;
    const sideMode = controlledMode ?? localMode;
    const setSideMode = React.useCallback((mode) => {
        if (typeof document !== 'undefined') {
            const sidebar = host.current?.querySelector('.lab-workspace-side-boundary');
            const top = host.current?.querySelector('.lab-workspace-top-side');
            if ((mode === 'hidden' && sidebar?.contains(document.activeElement)) ||
                (mode === 'expanded' && top?.contains(document.activeElement)))
                main.current?.focus({ preventScroll: true });
        }
        setLocalMode(mode);
        onSideModeChange?.(mode);
    }, [onSideModeChange]);
    React.useLayoutEffect(() => {
        if (!host.current)
            return;
        const element = host.current;
        const measure = () => setMeasuredCompact(element.clientWidth < compactBreakpoint);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [compactBreakpoint]);
    React.useEffect(() => {
        if (!compact)
            setDrawerOpen(false);
    }, [compact]);
    const cycleSide = React.useCallback(() => {
        // Move keyboard focus before the sidebar containing the toggle becomes inert.
        if (sideMode === 'rail')
            main.current?.focus({ preventScroll: true });
        setSideMode(sideMode === 'expanded' ? 'rail' : sideMode === 'rail' ? 'hidden' : 'expanded');
    }, [sideMode, setSideMode]);
    const state = React.useMemo(() => ({ compact, sideMode, setSideMode, cycleSide, drawerOpen, setDrawerOpen, sideId }), [compact, sideMode, setSideMode, cycleSide, drawerOpen, sideId]);
    const render = (slot) => (typeof slot === 'function' ? slot(state) : slot);
    const visibleSide = Boolean(side) && !compact && !drawerOpen && sideMode !== 'hidden';
    // The content is a card only when something frames it (a top row or a visible sidebar);
    // otherwise it fills the window edge to edge.
    const framed = Boolean(topSide) || visibleSide;
    return (_jsx(WorkspaceScaffoldContext.Provider, { value: state, children: _jsxs("div", { ref: host, className: cn('lab-workspace-scaffold', className), style: style, dir: dir, "data-side-mode": visibleSide ? sideMode : 'hidden', "data-framed": framed, "data-compact": compact, "data-lab-sheet-backdrop": "", children: [_jsx(PixelShader, { className: "lab-workspace-scaffold-pixels", density: 0.8, speed: 0.18 }), topSide && _jsx("div", { className: "lab-workspace-top-side", children: render(topSide) }), _jsxs("div", { className: "lab-workspace-scaffold-row", children: [_jsx("div", { className: "lab-workspace-side-boundary", inert: !visibleSide || undefined, "aria-hidden": !visibleSide || undefined, children: _jsx("div", { id: sideId, className: "lab-workspace-side-content", children: !compact && !drawerOpen && render(side) }) }), _jsx("div", { ref: main, className: "lab-workspace-main", tabIndex: -1, children: renderViewport ? (renderViewport({ appBar: render(appBar), bottom: render(bottom) })) : (_jsx(ScrollArea, { ref: contentViewportRef, className: "lab-workspace-route", label: contentLabel, top: appBar ? render(appBar) : undefined, bottom: bottom ? render(bottom) : undefined, children: render(children) })) })] }), compact && (_jsx(WorkspaceDrawer, { open: drawerOpen, label: drawerLabel, returnFocusRef: drawerReturnFocusRef, onClose: () => setDrawerOpen(false), children: _jsx("div", { dir: dir, className: "lab-workspace-drawer-side", children: render(side) }) }))] }) }));
}
/** Sidebar body: a scroll area with `leading` floating at the top and `trailing` at the bottom. */
export function ScaffoldSide({ leading, children, trailing, className }) {
    // In the rail the sidebar is one toolbar bubble wide: bottom groups stack their controls, and a
    // layout transition carries each control from its place in the row to its place in the column.
    const rail = React.useContext(WorkspaceScaffoldContext)?.sideMode === 'rail';
    const trailingRef = React.useRef(null);
    React.useLayoutEffect(() => {
        trailingRef.current
            ?.querySelectorAll('.lab-toolbar-group > *')
            .forEach((control, i) => {
            control.dataset.labLayoutId ??= `side-trailing-${i}`;
        });
    });
    return (_jsx("aside", { className: cn('lab-workspace-side', className), "aria-label": "Workspace sidebar", children: _jsx(ScrollArea, { className: "lab-workspace-side-main", label: "Sidebar navigation content", top: leading ? _jsx("div", { className: "lab-workspace-side-leading", children: leading }) : undefined, bottom: trailing ? (_jsx("div", { ref: trailingRef, className: "lab-workspace-side-trailing", children: _jsx(ToolbarOrientationContext.Provider, { value: rail ? 'vertical' : 'horizontal', children: _jsx(LayoutGroup, { layoutKey: rail, animateEnter: false, children: trailing }) }) })) : undefined, children: children }) }));
}
/** Narrower than this (px), a title squeezed by the bar's other groups leaves instead of showing a
 * sliver: its glass flows into the neighbouring bubble. Flutter: `appBarTitleMinWidth`. */
export const APP_BAR_TITLE_MIN_WIDTH = 64;
/** Transparent bar for the content panel's `appBar` slot; put controls in ToolbarGroups. A title
 * squeezed below `APP_BAR_TITLE_MIN_WIDTH` hides until there is room again. */
export function ScaffoldAppBar({ leading, children, trailing, className }) {
    const title = React.useRef(null);
    const [squeezed, setSqueezed] = React.useState(false);
    React.useLayoutEffect(() => {
        const slot = title.current;
        if (!slot || typeof ResizeObserver === 'undefined')
            return;
        // The slot keeps its flex size while hidden (visibility only), so this never flips back.
        const truncated = (node) => node.scrollWidth > node.clientWidth + 1;
        const check = () => setSqueezed(slot.clientWidth < APP_BAR_TITLE_MIN_WIDTH && (truncated(slot) || [...slot.querySelectorAll('*')].some(truncated)));
        check();
        const observer = new ResizeObserver(check);
        observer.observe(slot);
        for (const child of slot.children)
            observer.observe(child);
        const mutations = new MutationObserver(() => {
            for (const child of slot.children)
                observer.observe(child);
            check();
        });
        mutations.observe(slot, { childList: true });
        return () => {
            observer.disconnect();
            mutations.disconnect();
        };
    }, []);
    return (_jsxs(GlassScope, { as: "header", className: cn('lab-workspace-app-bar', className), children: [_jsx("div", { className: "lab-workspace-app-leading", children: leading }), _jsx("div", { ref: title, className: "lab-workspace-app-title", "data-squeezed": squeezed || undefined, "data-glass-hidden": squeezed ? '' : undefined, children: children }), _jsx("div", { className: "lab-workspace-app-trailing", children: trailing })] }));
}
/** Three-column bar for the `topSide` slot: start, centered brand, end. */
export function ScaffoldTopBar({ leading, children, trailing, className }) {
    return (_jsxs(GlassScope, { as: "header", className: cn('lab-workspace-top-bar', className), children: [_jsx("div", { children: leading }), _jsx("div", { className: "lab-workspace-top-brand", children: children }), _jsx("div", { children: trailing })] }));
}
/** Icon button that drives the nearest Scaffold's sidebar; opens the drawer when compact. */
export function ScaffoldToggleButton({ action = 'cycle', label, }) {
    const state = useScaffold();
    const drawer = action === 'drawer' || state.compact;
    const accessibleLabel = label ||
        (drawer
            ? 'Open workspace navigation'
            : action === 'restore' || state.sideMode === 'hidden'
                ? 'Expand workspace sidebar'
                : state.sideMode === 'expanded'
                    ? 'Minimize workspace sidebar'
                    : 'Hide workspace sidebar');
    return (_jsx(IconButton, { variant: "text", "aria-label": accessibleLabel, "aria-haspopup": drawer ? 'dialog' : undefined, "aria-controls": drawer ? undefined : state.sideId, "aria-expanded": drawer ? state.drawerOpen : state.sideMode !== 'hidden', onClick: () => drawer
            ? state.setDrawerOpen(true)
            : action === 'restore'
                ? state.setSideMode('expanded')
                : state.cycleSide(), children: drawer ? (_jsx(Menu, {})) : state.sideMode === 'expanded' ? (_jsx(PanelLeftClose, { className: "lab-dir-flip" })) : (_jsx(PanelLeftOpen, { className: "lab-dir-flip" })) }));
}
/** The compact navigation drawer: a full-height panel from the logical start over a dimmed page. */
function WorkspaceDrawer({ open, label, returnFocusRef, onClose, children, }) {
    const { t } = useI18n();
    const { mounted, state } = usePresence(open, 240);
    if (!mounted)
        return null;
    const close = () => {
        if (state === 'open')
            onClose();
    };
    return (_jsxs(PresentationHost, { kind: "drawer", label: label, returnFocusRef: returnFocusRef, onEscape: close, children: [_jsx("div", { className: "lab-presentation-scrim lab-workspace-drawer-scrim", "data-state": state, "aria-hidden": "true", onClick: close }), _jsxs("div", { className: "lab-workspace-drawer", "data-state": state, children: [_jsx("span", { className: "lab-workspace-drawer-paint", "aria-hidden": "true", children: _jsx(PixelTexture, { variant: "grain", seed: "workspace-drawer", density: "sparse" }) }), _jsx(IconButton, { variant: "ghost", controlSize: "regular", className: "lab-workspace-drawer-close", "aria-label": t('lab.common.close'), onClick: close, children: _jsx(X, { size: 18 }) }), children] })] }));
}
//# sourceMappingURL=scaffold.js.map