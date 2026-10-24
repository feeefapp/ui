import * as React from 'react';
import type { PresentationChromeProps } from './modal.js';
import './presentation.css';
export type PaneProps = PresentationChromeProps & {
    /** Shows the pane. Keep it mounted and toggle this so it can slide out. */
    open: boolean;
    /** Called with `false` by Escape, a backdrop click, the close bubble (and a drag down as a sheet). */
    onOpenChange: (open: boolean) => void;
    /** The content. It scrolls under the floating header and dock. */
    children: React.ReactNode;
    /** Width in px. Default 420, at most 60% of the window. */
    width?: number;
    /** The side it slides in from: `end` (default; the right in LTR, the left in RTL) or `start`. */
    side?: 'end' | 'start';
    /**
     * True (default) dims the page and traps focus. False leaves the page usable beside it, like an
     * inspector: no scrim, no focus trap; Escape still closes it while focus is inside.
     */
    modal?: boolean;
    /** As a sheet on phones: open at full height instead of fitting the content. */
    fill?: boolean;
    /** Whether Escape, a backdrop click and (as a sheet) a drag down close it. Default true. */
    dismissible?: boolean;
    /** Below this width (px) the same content is a bottom `Sheet`. Default 720. */
    compactBreakpoint?: number;
    /** Space in px between the floats and the pane's edges. Default: the shell gap G. */
    edgeGap?: number;
    /** Content padding in px. Default 16 (a card's inside). */
    contentPadding?: number;
    /** Focused when the pane opens. Default: the first control. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focused after it closes, when the control that opened it may be gone. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Renders inside this positioned element instead of the top layer (previews). */
    container?: HTMLElement | null;
    /** Class name of the pane surface. */
    className?: string;
};
/**
 * An inspector beside the page: a full-height opaque panel the shell gap G from the screen edges
 * that slides in from the end side (mirrored in RTL), with the close bubble floating beside it,
 * a floating glass header and a dock. Below the compact breakpoint the same content is a bottom
 * `Sheet`, so you write it once. Use it for the details of the thing the page is about.
 */
export declare function Pane(props: PaneProps): React.JSX.Element;
//# sourceMappingURL=pane.d.ts.map