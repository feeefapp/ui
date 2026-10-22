import * as React from 'react';
import { type SheetDetent } from './sheet-model.js';
import './sheet.css';
export type { SheetDetent } from './sheet-model.js';
export type SheetProps = {
    /** Shows the sheet. It animates in and out; keep it mounted and toggle this. */
    open: boolean;
    /** Called with `false` when the person dismisses it (drag down, scrim, Escape), and never with `true`. */
    onOpenChange: (open: boolean) => void;
    /** Accessible name of the sheet. */
    label: string;
    /** Sheet content; it scrolls inside the sheet. */
    children: React.ReactNode;
    /** Heights the sheet rests at, lowest first is not required. Default `['large']`. */
    detents?: readonly SheetDetent[];
    /** Controlled detent. Pair with `onDetentChange`. */
    detent?: SheetDetent;
    /** Detent to open at when uncontrolled. Default: the first in `detents`. */
    defaultDetent?: SheetDetent;
    /** Called when the person drags or taps the grabber to another detent. */
    onDetentChange?: (detent: SheetDetent) => void;
    /** Whether dragging down, the scrim and Escape close it. Default true. */
    dismissible?: boolean;
    /** Shows the grabber. Default: when there is more than one detent. */
    grabber?: boolean;
    /** Floating chrome over the top of the content: a title and a Done button in glass groups. */
    top?: React.ReactNode;
    /** Floating chrome over the bottom: usually a Dock with the sheet's main action. */
    bottom?: React.ReactNode;
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
    /** Inline content padding in px. */
    contentPadding?: number;
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