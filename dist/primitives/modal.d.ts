import * as React from 'react';
import { type LabScrollAreaProps } from '../scroll/index.js';
export declare function LabModal({ open, children, close, label, wide, className, scrollable, top, bottom, initialFocusRef, returnFocusRef, scrollOptions, fitContent, headerless, showClose, }: {
    open?: boolean;
    children: React.ReactNode;
    close: () => void;
    label: string;
    wide?: boolean;
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
    bottom?: React.ReactNode;
    /** Focused after the native dialog opens; keep the ref stable across content edits. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focus restored after the dialog finishes closing, even if its original trigger unmounted. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    scrollOptions?: Pick<LabScrollAreaProps, 'edgeGap' | 'contentPadding'>;
}): React.JSX.Element | null;
//# sourceMappingURL=modal.d.ts.map