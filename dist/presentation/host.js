'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { FloatingPortalScope } from '../menu/boundary.js';
import { createPortal } from 'react-dom';
import { cn } from '../utils.js';
/**
 * Enters the top layer from the dialog's first child, so the dialog is shown before any of its
 * content runs a layout effect: React runs children's layout effects before their parent's, and
 * everything measured in a closed (display: none) dialog would read zeros (a dock sized to its
 * padding, glass that then grows in, a body height of 0).
 */
function TopLayerEntry({ modal, opener }) {
    const mark = React.useRef(null);
    React.useLayoutEffect(() => {
        const dialog = mark.current?.parentElement;
        if (!(dialog instanceof HTMLDialogElement) || dialog.open)
            return;
        // Showing a modal dialog moves focus into it: remember what had it, to give it back.
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (modal)
            dialog.showModal();
        else
            dialog.show();
    }, []);
    return _jsx("span", { ref: mark, hidden: true });
}
/**
 * The layer every presentation surface lives in: a `<dialog>` covering the viewport in the top
 * layer (or a `role="dialog"` box covering a container), shown modally or not. It owns what all
 * surfaces share: entering and leaving the top layer, the accessible name, Escape, and focus in
 * and back out. Motion, scrim and the surface itself belong to the caller; keep the host mounted
 * until the exit animation ends and unmount it then (focus returns on unmount).
 */
export const PresentationHost = React.forwardRef(function PresentationHost({ kind, label, labelledBy, describedBy, role = 'dialog', modal = true, container, onEscape, initialFocusRef, returnFocusRef, className, style, children, }, ref) {
    const host = React.useRef(null);
    // Floating panels opened inside render into the surface (see FloatingPortalScope).
    const [layer, setLayer] = React.useState(null);
    const setHost = React.useCallback((node) => {
        host.current = node;
        setLayer(node);
    }, []);
    const escape = React.useRef(onEscape);
    escape.current = onEscape;
    const returnTo = React.useRef(returnFocusRef);
    returnTo.current = returnFocusRef;
    const opener = React.useRef(null);
    /** What had focus before the surface opened, kept across an effect that runs again. */
    const giveBack = React.useRef(null);
    React.useImperativeHandle(ref, () => host.current, []);
    const inline = container !== undefined;
    React.useLayoutEffect(() => {
        const element = host.current;
        if (!element)
            return;
        // A field that focused itself while mounting (React's `autoFocus`) keeps focus: showing the
        // dialog would hand it to the first control, and the blur would mark the field as visited.
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const autofocused = active && element.contains(active) ? active : null;
        // TopLayerEntry already showed the dialog and remembered what had focus before it.
        const previous = opener.current ?? (autofocused ? null : active);
        opener.current = null;
        if (previous && !element.contains(previous))
            giveBack.current = previous;
        if (element instanceof HTMLDialogElement && !element.open) {
            if (modal)
                element.showModal();
            else
                element.show();
        }
        const first = initialFocusRef?.current ?? autofocused;
        if (first)
            first.focus({ preventScroll: true });
        else if (inline && modal)
            element.focus({ preventScroll: true });
        return () => {
            // React can run this effect again at once (Strict Mode, a new container): closing and
            // handing focus back then would blur the field inside. Only a host that really left does it.
            queueMicrotask(() => {
                if (element.isConnected)
                    return;
                // Leave the top layer first: nothing outside a modal dialog can take focus.
                if (element instanceof HTMLDialogElement && element.open)
                    element.close();
                const preferred = returnTo.current?.current;
                const target = preferred?.isConnected ? preferred : giveBack.current;
                if (target?.isConnected)
                    target.focus({ preventScroll: true });
            });
        };
        // A container that arrives later (a ref set after the first render) mounts the host then.
    }, [container]);
    const shared = {
        className: cn('lab-presentation', className),
        style,
        'data-kind': kind,
        'data-modal': modal || undefined,
        'aria-label': labelledBy ? undefined : label,
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy,
    };
    if (inline) {
        if (!container)
            return null;
        return createPortal(_jsx("div", { ...shared, ref: setHost, "data-inline": "", role: role, "aria-modal": modal || undefined, tabIndex: -1, onKeyDown: (event) => {
                if (event.key !== 'Escape' || !modal)
                    return;
                event.stopPropagation();
                escape.current?.();
            }, children: _jsx(FloatingPortalScope, { element: layer, children: children }) }), container);
    }
    return createPortal(_jsxs("dialog", { ...shared, ref: setHost, role: role === 'alertdialog' ? 'alertdialog' : undefined, onCancel: (event) => {
            event.preventDefault();
            escape.current?.();
        }, children: [_jsx(TopLayerEntry, { modal: modal, opener: opener }), _jsx(FloatingPortalScope, { element: layer, children: children })] }), document.body);
});
/**
 * Keeps a surface mounted while it leaves: `mounted` turns true as soon as `open` does, and false
 * only when the surface calls `exited()` at the end of its exit animation.
 */
export function usePresented(open) {
    const [mounted, setMounted] = React.useState(open);
    if (open && !mounted)
        setMounted(true);
    const exited = React.useCallback(() => setMounted(false), []);
    return { mounted, exited };
}
//# sourceMappingURL=host.js.map