import * as React from 'react';
import type { PresentationChromeProps } from '../presentation/modal.js';
import { type SheetDetent } from './sheet-model.js';
import '../presentation/presentation.css';
import './sheet.css';
export type { SheetDetent } from './sheet-model.js';
export type SheetProps = PresentationChromeProps & {
    /** Shows the sheet. It animates in and out; keep it mounted and toggle this. */
    open: boolean;
    /** Called with `false` when the person dismisses it (drag down, scrim, Escape, close bubble), never with `true`. */
    onOpenChange: (open: boolean) => void;
    /** Sheet content; it scrolls inside the sheet under the floating header and dock. */
    children: React.ReactNode;
    /** Heights the sheet rests at, lowest first is not required. Default `['large']`. */
    detents?: readonly SheetDetent[];
    /** Controlled detent. Pair with `onDetentChange`. */
    detent?: SheetDetent;
    /** Detent to open at when uncontrolled. Default: the first in `detents`. */
    defaultDetent?: SheetDetent;
    /** Called when the person drags or taps the grabber to another detent. */
    onDetentChange?: (detent: SheetDetent) => void;
    /** Whether dragging down, the scrim and Escape close it. Default true. The close bubble always does. */
    dismissible?: boolean;
    /** Shows the grabber. Default: when there is more than one detent. */
    grabber?: boolean;
    /**
     * `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet,
     * like a map with a results sheet; the sheet then has no scrim and no Escape dismissal.
     */
    modal?: boolean;
    /** What the sheet becomes on wide screens: a centered `dialog` (default) or still a bottom `sheet`. */
    regular?: 'dialog' | 'sheet';
    /** Width in px from which the sheet is “regular” (wide). Default 720. */
    regularBreakpoint?: number;
    /** Renders inside this element (absolutely positioned) instead of the top layer: for embedded previews. */
    container?: HTMLElement | null;
    /** On phones, let the page behind recede (scale back) as a large sheet rises. Default true. */
    recede?: boolean;
    /** Content padding in px. Default: the shell gap G (list sections bring their own inset). */
    contentPadding?: number;
    /** Focused when the sheet opens. Default: the sheet itself. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focused after it closes, when the control that opened it may be gone. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Class name of the sheet panel. */
    className?: string;
};
/**
 * A sheet that rises from the bottom, like iOS: it rests at detents (half, full, fit or custom
 * heights), follows the finger when dragged, snaps to the detent a flick projects to, and closes
 * when flicked down. Scrolling inside hands off to dragging the sheet at the top. On wide screens
 * it becomes a centered dialog. The page behind dims and, under a full-height sheet, recedes.
 */
export declare function Sheet(props: SheetProps): React.JSX.Element | null;
//# sourceMappingURL=sheet.d.ts.map