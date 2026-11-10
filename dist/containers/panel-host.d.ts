import * as React from 'react';
import { type PanelSizing, type PanelWidths } from './panel-model.js';
import type { PresentationChromeProps } from '../presentation/modal.js';
import './panel.css';
/** An independent work surface. Header tools and close always belong to this panel. */
export type PanelProps = PresentationChromeProps & {
    /** Scrollable content. It is mounted once for this panel's stable identity. */
    children: React.ReactNode;
    /** Content inset in CSS pixels; defaults to the shared presentation body inset. */
    contentPadding?: number;
    /** Standalone close action; a PanelHost supplies its own guarded close action. */
    onClose?: () => void;
    /** Class on the content surface, not the host column. */
    className?: string;
};
/** A stable work identity plus its independent surface and desktop sizing preferences. */
export type PanelEntry = PanelSizing & {
    /** Unique within the host. Keep unchanged while updating the same work; change to reset it. */
    id: string;
    /** One Panel element, including its own title, tools and body. */
    panel: React.ReactElement<PanelProps>;
};
/** Why descendants would be discarded. */
export type PanelChangeReason = 'push' | 'replace' | 'close';
/** Navigation requests coordinated by one host. All operations are controlled. */
export type PanelStackState = {
    /** Current controlled array, including the root at index zero. */
    panels: readonly PanelEntry[];
    /** Whether a close guard is pending; duplicate requests are ignored. */
    pending: boolean;
    /** Append, or truncate descendants after an ancestor before appending. */
    push: (panel: PanelEntry, after?: string) => Promise<boolean>;
    /** Replace a panel (last by default), truncating descendants. */
    replace: (panel: PanelEntry, id?: string) => Promise<boolean>;
    /** Close a panel and descendants. The root cannot be closed. */
    close: (id: string) => Promise<boolean>;
};
/** Access the nearest host's controlled navigation requests. Not business or routing state. */
export declare function usePanelStack(): PanelStackState;
/** Opaque, bounded scrolling surface; inside a host its very same Sheet tree becomes a column. */
export declare function Panel({ onClose, ...props }: PanelProps): React.JSX.Element;
export type PanelHostProps = {
    /** Controlled chain, root first. Stable unique IDs preserve drafts and scroll while resizing. */
    panels: readonly PanelEntry[];
    /** Echo the requested chain into panels. The host never keeps a shadow navigation stack. */
    onPanelsChange: (panels: readonly PanelEntry[]) => void;
    /** Enables pointer and keyboard resizing between visible desktop columns. Default true. */
    resizable?: boolean;
    /** Controlled desktop width preferences in CSS pixels, keyed by stable panel ID. Echo onWidthsChange. */
    widths?: PanelWidths;
    /** Initial uncontrolled width preferences keyed by panel ID. Defaults to each entry's preferredWidth. */
    defaultWidths?: PanelWidths;
    /** Reports resized ID-keyed preferences. Optional; persistence belongs to the application, not this kit. */
    onWidthsChange?: (widths: PanelWidths) => void;
    /** Container width below which details become native, stacked modal Sheets. Default 720. */
    breakpoint?: number;
    /** Optional column gap in CSS pixels. Default: the theme's --lab-shell-gap. */
    gap?: number;
    /** Approve discarding these entries, deepest first. False cancels; may await confirmation. */
    beforeClose?: (panels: readonly PanelEntry[], reason: PanelChangeReason) => boolean | Promise<boolean>;
    /** Reports a rejected guard. Keep confirmation/error UX in the owner; the stack is unchanged. */
    onCloseError?: (error: unknown) => void;
    /** Class on the bounded, measured workspace. */
    className?: string;
    /** Layout styles; the host must receive bounded height from its parent. */
    style?: React.CSSProperties;
};
/**
 * One coordinator for any depth: newest fitting desktop columns, stacked compact Sheets.
 * All entries stay mounted under identical parents. Only explicit removal resets child state.
 * Native dialog top-layer promotion changes presentation without a portal or second content copy.
 */
export declare function PanelHost({ panels, onPanelsChange, resizable, widths: controlledWidths, defaultWidths, onWidthsChange, breakpoint, gap, beforeClose, onCloseError, className, style }: PanelHostProps): React.JSX.Element;
/** Alias for PanelHost when naming the complete controlled chain rather than its layout role. */
export declare const PanelStack: typeof PanelHost;
//# sourceMappingURL=panel-host.d.ts.map