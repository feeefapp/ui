import * as React from 'react';
import { type LabScrollAreaProps } from '../scroll/index.js';
/**
 * A modal dialog on the native `<dialog>`: focus is trapped, Escape and a backdrop click call
 * `close`, and focus returns to the opener after the exit transition.
 */
export declare function LabModal({ open, children, close, label, wide, className, scrollable, top, bottom, initialFocusRef, returnFocusRef, scrollOptions, fitContent, headerless, showClose, }: {
    /** Whether the dialog is shown. Keep it mounted and toggle this so the exit transition can run. */
    open?: boolean;
    /** Dialog body. */
    children: React.ReactNode;
    /** Called by Escape, a backdrop click and the close button. Set `open` to false here. */
    close: () => void;
    /** Accessible name; also the default title in a scrollable dialog. */
    label: string;
    /** Uses the wider dialog width, for side-by-side content such as two calendars. */
    wide?: boolean;
    /** Class name for the `<dialog>` element. */
    className?: string;
    /** Full-bleed content with measured floating chrome. Preferred for new scrollable dialogs. */
    scrollable?: boolean;
    /** Omit default chrome when the content supplies its own heading and dismiss action. */
    headerless?: boolean;
    /** Hide the default dismiss icon when a visible Cancel/Close action already exists. */
    showClose?: boolean;
    /** Measure body and floating chrome, capped at the viewport. */
    fitContent?: boolean;
    /** Optional leading header content. The default is the dialog label as a quiet title. */
    top?: React.ReactNode;
    /** Floating bottom chrome for a scrollable dialog, usually a `LabDock` with the dialog's actions. */
    bottom?: React.ReactNode;
    /** Focused after the native dialog opens; keep the ref stable across content edits. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focus restored after the dialog finishes closing, even if its original trigger unmounted. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Scrollable dialogs only: spacing passed to the inner `LabScrollArea`. */
    scrollOptions?: Pick<LabScrollAreaProps, 'edgeGap' | 'contentPadding'>;
}): React.JSX.Element | null;
//# sourceMappingURL=modal.d.ts.map