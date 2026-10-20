import * as React from 'react';
import './scaffold.css';
export type LabScaffoldSideMode = 'expanded' | 'rail' | 'hidden';
export type LabScaffoldState = {
    compact: boolean;
    sideMode: LabScaffoldSideMode;
    setSideMode: (mode: LabScaffoldSideMode) => void;
    cycleSide: () => void;
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
    sideId: string;
};
export declare function useLabScaffold(): LabScaffoldState;
type ScaffoldSlot = React.ReactNode | ((state: LabScaffoldState) => React.ReactNode);
export type LabScaffoldProps = {
    /** Editors with an existing LabScrollArea receive the floating slots directly. */
    renderViewport?: (slots: {
        appBar: React.ReactNode;
        bottom: React.ReactNode;
    }) => React.ReactNode;
    children: ScaffoldSlot;
    side?: ScaffoldSlot;
    topSide?: ScaffoldSlot;
    appBar?: ScaffoldSlot;
    bottom?: ScaffoldSlot;
    contentViewportRef?: React.Ref<HTMLDivElement>;
    contentLabel?: string;
    sideMode?: LabScaffoldSideMode;
    defaultSideMode?: LabScaffoldSideMode;
    onSideModeChange?: (mode: LabScaffoldSideMode) => void;
    /** Override for embedded previews; otherwise the host's width selects compact mode. */
    compact?: boolean;
    compactBreakpoint?: number;
    drawerReturnFocusRef?: React.RefObject<HTMLElement | null>;
    drawerLabel?: string;
    className?: string;
    style?: React.CSSProperties;
    dir?: 'ltr' | 'rtl';
};
/** Shared workspace structure. LabProvider owns theme, services and portals. */
export declare function LabScaffold({ children, renderViewport, side, topSide, appBar, bottom, contentLabel, contentViewportRef, sideMode: controlledMode, defaultSideMode, onSideModeChange, compact: compactOverride, compactBreakpoint, drawerLabel, drawerReturnFocusRef, className, style, dir, }: LabScaffoldProps): React.JSX.Element;
type ThreeSlots = {
    leading?: React.ReactNode;
    children?: React.ReactNode;
    trailing?: React.ReactNode;
    className?: string;
};
export declare function LabScaffoldSide({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
export declare function LabScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
export declare function LabScaffoldTopBar({ leading, children, trailing, className }: ThreeSlots): React.JSX.Element;
export declare function LabScaffoldToggleButton({ action, label, }: {
    action?: 'cycle' | 'restore' | 'drawer';
    label?: string;
}): React.JSX.Element;
export {};
//# sourceMappingURL=scaffold.d.ts.map