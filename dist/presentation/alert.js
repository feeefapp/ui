'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { Button } from '../primitives/button.js';
import { PresentationHost, usePresented } from './host.js';
import { usePopMotion } from './motion.js';
import { alertActionOrder, alertActionsFit } from './alert-model.js';
import '../glass/glass.css';
import '../menu/menu.css';
import './presentation.css';
const variantOf = (role) => role === 'primary' ? 'filled' : role === 'destructive' ? 'destructive' : 'elevated';
/**
 * A small centred decision, like an iOS alert: a title, a message and capsule buttons on the thick
 * glass the menus use, over a dimmed page. Choosing an action closes it; Escape runs the cancel
 * action. Use it for confirmations (“Delete order?”); use `Modal` for anything with a form.
 */
export function Alert(props) {
    const { mounted, exited } = usePresented(props.open);
    if (!mounted)
        return null;
    return _jsx(AlertPresentation, { ...props, onExited: exited });
}
function AlertPresentation({ open, onOpenChange, title, message, actions, children, initialFocusRef, returnFocusRef, container, className, onExited, }) {
    const surface = React.useRef(null);
    const scrim = React.useRef(null);
    const row = React.useRef(null);
    const buttons = React.useRef([]);
    const titleId = React.useId();
    const messageId = React.useId();
    const [sideBySide, setSideBySide] = React.useState(actions.length === 2);
    usePopMotion(open, surface, scrim, onExited);
    // Two actions sit side by side while both labels fit half the row; otherwise they stack.
    React.useLayoutEffect(() => {
        const element = row.current;
        if (!element)
            return;
        const measure = () => {
            const widths = buttons.current.slice(0, actions.length).filter(Boolean).map((button) => {
                const label = button.querySelector('.lab-alert-action-label');
                const style = getComputedStyle(button);
                return ((label?.offsetWidth ?? button.scrollWidth) +
                    parseFloat(style.paddingInlineStart) +
                    parseFloat(style.paddingInlineEnd) +
                    parseFloat(style.borderInlineStartWidth) +
                    parseFloat(style.borderInlineEndWidth));
            });
            const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
            const next = alertActionsFit(widths, element.clientWidth, gap);
            setSideBySide((previous) => (previous === next ? previous : next));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        return () => observer.disconnect();
    }, [actions.map((action) => action.label).join('\u0000')]);
    const order = alertActionOrder(actions.map((action) => action.role), sideBySide);
    const cancelIndex = actions.findIndex((action) => action.role === 'cancel');
    const choose = (index) => {
        if (!open)
            return;
        if (actions[index].onAction?.() === false)
            return;
        onOpenChange(false);
    };
    // Focus the safe choice: cancel when there is one, otherwise the last (main) action.
    const fallbackFocus = React.useRef(null);
    const focusIndex = cancelIndex >= 0 ? cancelIndex : actions.length - 1;
    return (_jsxs(PresentationHost, { kind: "alert", role: "alertdialog", label: title, labelledBy: titleId, describedBy: message != null ? messageId : undefined, container: container, initialFocusRef: initialFocusRef ?? fallbackFocus, returnFocusRef: returnFocusRef, onEscape: () => {
            if (cancelIndex >= 0)
                choose(cancelIndex);
        }, children: [_jsx("div", { ref: scrim, className: "lab-presentation-scrim", "aria-hidden": "true" }), _jsxs("div", { ref: surface, className: cn('lab-alert', className), "data-layout": sideBySide ? 'row' : 'stack', children: [_jsxs("div", { className: "lab-alert-text", children: [_jsx("h2", { id: titleId, className: "lab-alert-title", children: title }), message != null && (_jsx("div", { id: messageId, className: "lab-alert-message", children: message }))] }), children != null && _jsx("div", { className: "lab-alert-content", children: children }), _jsx("div", { ref: row, className: "lab-alert-actions", children: order.map((index) => {
                            const action = actions[index];
                            return (_jsx(Button, { ref: (element) => {
                                    buttons.current[index] = element;
                                    if (index === focusIndex)
                                        fallbackFocus.current = element;
                                }, variant: variantOf(action.role), className: "lab-alert-action", "data-role": action.role, disabled: action.disabled, onClick: () => choose(index), children: _jsx("span", { className: "lab-alert-action-label", children: action.label }) }, index));
                        }) })] })] }));
}
//# sourceMappingURL=alert.js.map