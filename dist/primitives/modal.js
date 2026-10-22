'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { useI18n } from '../i18n.js';
import { X } from 'lucide-react';
import { cn } from '../utils.js';
import { usePresence, useLatched } from '../motion.js';
import { Button, IconButton } from './button.js';
import { ToolbarGroup } from '../toolbar.js';
import { ScrollArea } from '../scroll/index.js';
import { GlassScope } from '../glass/container.js';
/**
 * A modal dialog on the native `<dialog>`: focus is trapped, Escape and a backdrop click call
 * `close`, and focus returns to the opener after the exit transition.
 */
export function Modal({ open = true, children, close, label, wide = false, className, scrollable = false, top, bottom, initialFocusRef, returnFocusRef, scrollOptions, fitContent = false, headerless = false, showClose = true, }) {
    const { mounted, state } = usePresence(open, 200);
    const content = useLatched({
        children,
        label,
        wide,
        className,
        scrollable,
        top,
        bottom,
        initialFocusRef,
        returnFocusRef,
        scrollOptions,
        fitContent,
        headerless,
        showClose,
    }, open);
    if (!mounted)
        return null;
    return (_jsx(Dialog, { state: state, close: close, ...content, children: content.children }));
}
function Dialog({ state, children, close, label, wide, className, scrollable, top, bottom, initialFocusRef, returnFocusRef, scrollOptions, fitContent, headerless, showClose, }) {
    const { t } = useI18n();
    const ref = React.useRef(null);
    const bodyRef = React.useRef(null);
    const [contentHeight, setContentHeight] = React.useState();
    React.useLayoutEffect(() => {
        if (!fitContent || !scrollable || !ref.current || !bodyRef.current)
            return;
        const dialog = ref.current;
        const body = bodyRef.current;
        const content = body.parentElement;
        const measure = () => {
            if (!dialog.open)
                return;
            const padding = getComputedStyle(content);
            const border = getComputedStyle(dialog);
            const topFloat = dialog.querySelector('.lab-scroll-float--top');
            const bottomFloat = dialog.querySelector('.lab-scroll-float--bottom');
            const chromeMinimum = (topFloat?.offsetHeight ?? 0) +
                (bottomFloat?.offsetHeight ?? 0) +
                (topFloat ? parseFloat(getComputedStyle(topFloat).top) || 0 : 0) +
                (bottomFloat ? parseFloat(getComputedStyle(bottomFloat).bottom) || 0 : 0);
            const next = Math.ceil(Math.max(chromeMinimum, body.offsetHeight +
                parseFloat(padding.paddingTop) +
                parseFloat(padding.paddingBottom) +
                parseFloat(border.borderTopWidth) +
                parseFloat(border.borderBottomWidth)));
            setContentHeight((previous) => (previous === next ? previous : next));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(body);
        // Border box: the floats' reserved padding can change without the body resizing.
        observer.observe(content, { box: 'border-box' });
        dialog.querySelectorAll('.lab-scroll-float').forEach((element) => observer.observe(element));
        const frame = requestAnimationFrame(measure);
        measure();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [fitContent, scrollable, headerless, showClose, Boolean(top), Boolean(bottom)]);
    const openingFocusRef = React.useRef(initialFocusRef);
    const closingFocusRef = React.useRef(returnFocusRef);
    const titleId = React.useId();
    const defaultTitle = scrollable && !headerless && top == null;
    React.useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        openingFocusRef.current?.current?.focus({ preventScroll: true });
        return () => {
            dialog.close();
            // React can detach the dialog before this passive cleanup, so native
            // close() alone cannot reliably restore focus to the opening control.
            const preferred = closingFocusRef.current?.current;
            const target = preferred?.isConnected ? preferred : previousFocus;
            if (target?.isConnected)
                target.focus({ preventScroll: true });
        };
    }, []);
    return (_jsx("dialog", { ref: ref, "data-state": state, className: cn('lab-dialog', wide && 'lab-dialog-wide', scrollable && 'lab-dialog--scrollable', fitContent && scrollable && 'lab-dialog--fit-content', className), style: fitContent && contentHeight !== undefined
            ? { '--lab-modal-content-height': `${contentHeight}px` }
            : undefined, "aria-label": defaultTitle ? undefined : label, "aria-labelledby": defaultTitle ? titleId : undefined, onCancel: (e) => {
            e.preventDefault();
            if (state === 'open')
                close();
        }, onClick: (e) => {
            if (e.target === e.currentTarget && state === 'open')
                close();
        }, children: scrollable ? (_jsx(ScrollArea, { ...scrollOptions, label: label, top: headerless ? (top) : (_jsxs(GlassScope, { as: "header", className: cn('lab-modal-floating-top', defaultTitle && 'lab-modal-floating-top--default'), children: [_jsx("div", { className: "lab-modal-floating-title", children: top ?? (_jsx(ToolbarGroup, { label: "Dialog title", children: _jsx("h2", { id: titleId, className: "lab-modal-title", children: label }) })) }), showClose && (_jsx(ToolbarGroup, { label: "Dialog close action", children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", className: "lab-modal-close", "aria-label": t('lab.composer.closeLabel', { label }), disabled: state !== 'open', onClick: close, children: _jsx(X, { size: 20, "aria-hidden": "true" }) }) }))] })), bottom: bottom, children: fitContent ? (_jsx("div", { ref: bodyRef, className: "lab-modal-measured-body", children: children })) : (children) })) : (_jsxs(_Fragment, { children: [!headerless && showClose && (_jsx(Button, { variant: "ghost", controlSize: "icon", className: "lab-close", "aria-label": t('lab.common.close'), onClick: close, children: _jsx(X, { size: 18 }) })), children] })) }));
}
//# sourceMappingURL=modal.js.map