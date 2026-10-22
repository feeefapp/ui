import * as React from 'react';
import './scaffold.css';
/** Sidebar width: `expanded` (304px), `rail` (64px icons) or `hidden` (0). */
export type LabScaffoldSideMode = 'expanded' | 'rail' | 'hidden';
/** What `useLabScaffold()` and function slots receive. */
export type LabScaffoldState = {
    /** True below the compact breakpoint: the sidebar is replaced by a modal drawer. */
    compact: boolean;
    /** Current sidebar mode (ignored while compact). */
    sideMode: LabScaffoldSideMode;
    /** Sets the sidebar mode and calls `onSideModeChange`. */
    setSideMode: (mode: LabScaffoldSideMode) => void;
    /** Steps expanded → rail → hidden → expanded. */
    cycleSide: () => void;
    /** Whether the compact drawer is open. */
    drawerOpen: boolean;
    /** Opens or closes the compact drawer. */
    setDrawerOpen: (open: boolean) => void;
    /** Id of the sidebar region, for `aria-controls`. */
    sideId: string;
};
/** Reads the nearest LabScaffold's state. Throws outside a scaffold. */
export declare function useLabScaffold(): LabScaffoldState;
type ScaffoldSlot = React.ReactNode | ((state: LabScaffoldState) => React.ReactNode);
export type LabScaffoldProps = {
    /**
     * Replaces the default content scroll area. Receives the rendered `appBar` and `bottom` so an
     * editor with its own LabScrollArea can float them itself; `children` is then not rendered.
     */
    renderViewport?: (slots: {
        appBar: React.ReactNode;
        bottom: React.ReactNode;
    }) => React.ReactNode;
    /** Page content, rendered inside the content panel's scroll area. Can be a function of the state. */
    children: ScaffoldSlot;
    /** Sidebar content, usually a LabScaffoldSide. Rendered in the drawer when compact. */
    side?: ScaffoldSlot;
    /** Full-width row above the sidebar and content, usually a LabScaffoldTopBar. */
    topSide?: ScaffoldSlot;
    /** Floats over the top of the content panel, usually a LabScaffoldAppBar. */
    appBar?: ScaffoldSlot;
    /** Floats over the bottom of the content panel, usually a LabDock. */
    bottom?: ScaffoldSlot;
    /** Ref to the content scroll viewport (the element that scrolls). */
    contentViewportRef?: React.Ref<HTMLDivElement>;
    /** Accessible name of the content scroll region. */
    contentLabel?: string;
    /** Controlled sidebar mode. Pair with `onSideModeChange`. */
    sideMode?: LabScaffoldSideMode;
    /** Initial sidebar mode when uncontrolled. */
    defaultSideMode?: LabScaffoldSideMode;
    /** Called whenever the sidebar mode changes (toggle button, `setSideMode`, `cycleSide`). */
    onSideModeChange?: (mode: LabScaffoldSideMode) => void;
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
 * Workspace layout: optional top row, a sidebar (expanded, rail or hidden) and one rounded content
 * panel with floating app bar and bottom slots. Fills its parent's height. Below the compact
 * breakpoint the sidebar moves into a modal drawer. LabProvider owns theme, services and portals.
 */
export declare function LabScaffold({ children, renderViewport, side, topSide, appBar, bottom, contentLabel, contentViewportRef, sideMode: controlledMode, defaultSideMode, onSideModeChange, compact: compactOverride, compactBreakpoint, drawerLabel, drawerReturnFocusRef, className, style, dir, }: LabScaffoldProps): React.JSX.Element;
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
export declare function LabScaffoldSide({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Transparent bar for the content panel's `appBar` slot; put controls in LabToolbarGroups. */
export declare function LabScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Three-column bar for the `topSide` slot: start, centered brand, end. */
export declare function LabScaffoldTopBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
/** Icon button that drives the nearest LabScaffold's sidebar; opens the drawer when compact. */
export declare function LabScaffoldToggleButton({ action, label, }: {
    /** `cycle` steps expanded → rail → hidden, `restore` expands, `drawer` always opens the drawer. */
    action?: 'cycle' | 'restore' | 'drawer';
    /** Accessible name. Defaults to a description of what the click does. */
    label?: string;
}): React.JSX.Element;
export {};
//# sourceMappingURL=scaffold.d.ts.map