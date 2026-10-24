import * as React from 'react';
export type PresentationHostProps = {
    /** Which surface this hosts (`alert`, `modal`, `pane`, `sheet`, …); styles key off `data-kind`. */
    kind: string;
    /** Accessible name. Ignored when `labelledBy` points at a visible title. */
    label: string;
    /** Id of the visible title that names the surface. */
    labelledBy?: string;
    /** Id of the text that describes the surface (an alert's message). */
    describedBy?: string;
    /** `alertdialog` for decisions that interrupt (Alert); `dialog` otherwise. */
    role?: 'dialog' | 'alertdialog';
    /** True (default) makes the rest of the page inert and traps focus; false leaves it usable. */
    modal?: boolean;
    /** Renders inside this positioned element instead of the browser's top layer (previews). */
    container?: HTMLElement | null;
    /** Escape was pressed. */
    onEscape?: () => void;
    /** Focused once the surface is shown. Default: the browser's choice (the first control). */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focused when the surface unmounts; default whatever had focus before it opened. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};
/**
 * The layer every presentation surface lives in: a `<dialog>` covering the viewport in the top
 * layer (or a `role="dialog"` box covering a container), shown modally or not. It owns what all
 * surfaces share: entering and leaving the top layer, the accessible name, Escape, and focus in
 * and back out. Motion, scrim and the surface itself belong to the caller; keep the host mounted
 * until the exit animation ends and unmount it then (focus returns on unmount).
 */
export declare const PresentationHost: React.ForwardRefExoticComponent<PresentationHostProps & React.RefAttributes<HTMLElement>>;
/**
 * Keeps a surface mounted while it leaves: `mounted` turns true as soon as `open` does, and false
 * only when the surface calls `exited()` at the end of its exit animation.
 */
export declare function usePresented(open: boolean): {
    mounted: boolean;
    exited: () => void;
};
//# sourceMappingURL=host.d.ts.map