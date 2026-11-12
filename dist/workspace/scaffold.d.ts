import * as React from 'react';
import './scaffold.css';
/** Sidebar width: `expanded` (304px), `rail` (64px icons) or `hidden` (0). */
export type ScaffoldSideMode = 'expanded' | 'rail' | 'hidden';
/** What `useScaffold()` and function slots receive. */
export type ScaffoldState = {
    /** True below the compact breakpoint: the sidebar is replaced by a modal drawer. */
    compact: boolean;
    /** Current sidebar mode (ignored while compact). */
    sideMode: ScaffoldSideMode;
    /** Sets the sidebar mode and calls `onSideModeChange`. */
    setSideMode: (mode: ScaffoldSideMode) => void;
    /** Steps expanded → rail → hidden → expanded. */
    cycleSide: () => void;
    /** Whether the compact drawer is open. */
    drawerOpen: boolean;
    /** Opens or closes the compact drawer. */
    setDrawerOpen: (open: boolean) => void;
    /** Id of the sidebar region, for `aria-controls`. */
    sideId: string;
};
/** Reads the nearest Scaffold's state. Throws outside a scaffold. */
export declare function useScaffold(): ScaffoldState;
type ScaffoldSlot = React.ReactNode | ((state: ScaffoldState) => React.ReactNode);
export type ScaffoldProps = {
    /**
     * Replaces the default content scroll area. Receives the rendered `appBar` and `bottom` so an
     * editor with its own ScrollArea can float them itself; `children` is then not rendered.
     */
    renderViewport?: (slots: {
        appBar: React.ReactNode;
        bottom: React.ReactNode;
    }) => React.ReactNode;
    /** Outer content paint. Defaults to `card`; use `none` for independently painted Panels.
     * Shell spacing and focus remain in either mode, independently of `renderViewport`. */
    contentSurface?: 'card' | 'none';
    /** Page content, rendered inside the content panel's scroll area. Can be a function of the state. */
    children: ScaffoldSlot;
    /** Sidebar content, usually a ScaffoldSide. Rendered in the drawer when compact. */
    side?: ScaffoldSlot;
    /** Full-width row above the sidebar and content, usually a ScaffoldTopBar. */
    topSide?: ScaffoldSlot;
    /** Floats over the top of the content panel, usually a ScaffoldAppBar. */
    appBar?: ScaffoldSlot;
    /** Floats over the bottom of the content panel, usually a Dock. */
    bottom?: ScaffoldSlot;
    /** Ref to the content scroll viewport (the element that scrolls). */
    contentViewportRef?: React.Ref<HTMLDivElement>;
    /** Accessible name of the content scroll region. */
    contentLabel?: string;
    /** Controlled sidebar mode. Pair with `onSideModeChange`. */
    sideMode?: ScaffoldSideMode;
    /** Initial sidebar mode when uncontrolled. */
    defaultSideMode?: ScaffoldSideMode;
    /** Called whenever the sidebar mode changes (toggle button, `setSideMode`, `cycleSide`). */
    onSideModeChange?: (mode: ScaffoldSideMode) => void;
    /** Override for embedded previews; otherwise the host's width selects compact mode. */
    compact?: boolean;
    /** Host width in px below which the scaffold becomes compact. */
    compactBreakpoint?: number;
    /** Element that receives focus when the compact drawer closes. */
    drawerReturnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Accessible name of the compact drawer dialog. */
    drawerLabel?: string;
    className?: string;
    style?: React.CSSProperties;
    /** Text direction for the scaffold and its drawer. Inherited when omitted. */
    dir?: 'ltr' | 'rtl';
};
/**
 * Workspace layout: optional top row, a sidebar (expanded, rail or hidden) and a content viewport
 * (rounded card by default) with floating app bar and bottom slots. Fills its parent's height. Below the compact
 * breakpoint the sidebar moves into a modal drawer. Provider owns theme, services and portals.
 */
export declare function Scaffold({ children, renderViewport, contentSurface, side, topSide, appBar, bottom, contentLabel, contentViewportRef, sideMode: controlledMode, defaultSideMode, onSideModeChange, compact: compactOverride, compactBreakpoint, drawerLabel, drawerReturnFocusRef, className, style, dir, }: ScaffoldProps): React.JSX.Element;
type ThreeSlots = {
    /** Start content: a brand, back button or toggle. Pinned at the top in a sidebar. */
    leading?: React.ReactNode;
    /** Main content: navigation in a sidebar, the title in a bar. */
    children?: React.ReactNode;
    /** End content: actions, or the account tile pinned at the bottom of a sidebar. */
    trailing?: React.ReactNode;
    className?: string;
};
/** Sidebar body: a scroll area with `leading` floating at the top and `trailing` at the bottom. */
export declare function ScaffoldSide({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Narrower than this (px), a title squeezed by the bar's other groups leaves instead of showing a
 * sliver: its glass flows into the neighbouring bubble. Flutter: `appBarTitleMinWidth`. */
export declare const APP_BAR_TITLE_MIN_WIDTH = 64;
/** Transparent bar for the content panel's `appBar` slot; put controls in ToolbarGroups. A title
 * squeezed below `APP_BAR_TITLE_MIN_WIDTH` hides until there is room again. */
export declare function ScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Three-column bar for the `topSide` slot: start, centered brand, end. */
export declare function ScaffoldTopBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Icon button that drives the nearest Scaffold's sidebar; opens the drawer when compact. */
export declare function ScaffoldToggleButton({ action, label, }: {
    /** `cycle` steps expanded → rail → hidden, `restore` expands, `drawer` always opens the drawer. */
    action?: 'cycle' | 'restore' | 'drawer';
    /** Accessible name. Defaults to a description of what the click does. */
    label?: string;
}): React.JSX.Element;
export {};
//# sourceMappingURL=scaffold.d.ts.map