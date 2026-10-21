'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import '../system.css';
import './control-variants.css';
import './text-field.css';
/** Decoration only: the child owns editing, selection and validation behavior. */
export function LabFieldShell({ id: suppliedId, label, hint, dir, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, variant = 'outlined', controlSize = 'regular', disabled, required, invalid = false, describedBy, populated, alwaysFloat, counter, children, }) {
    const floatingHint = hint ?? label;
    const shellRef = React.useRef(null);
    const leadingRef = React.useRef(null);
    const trailingRef = React.useRef(null);
    React.useLayoutEffect(() => {
        const shell = shellRef.current;
        if (!shell)
            return;
        const measure = () => {
            shell.style.setProperty('--lab-field-inset-start', `${leadingRef.current ? leadingRef.current.getBoundingClientRect().width + 24 : 12}px`);
            shell.style.setProperty('--lab-field-inset-end', `${trailingRef.current ? trailingRef.current.getBoundingClientRect().width + 24 : 12}px`);
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        if (leadingRef.current)
            observer?.observe(leadingRef.current);
        if (trailingRef.current)
            observer?.observe(trailingRef.current);
        return () => observer?.disconnect();
    }, [leadingIcon, leading, trailing]);
    const generatedId = React.useId();
    const id = suppliedId || generatedId;
    const feedbackId = `${id}-feedback`;
    const counterId = `${id}-counter`;
    const isInvalid = Boolean(error) || invalid;
    const description = [describedBy, (error || supportingText) && feedbackId, counter != null && counterId]
        .filter(Boolean)
        .join(' ') || undefined;
    return (_jsxs("div", { className: cn('lab-text-field', containerClassName), dir: dir === 'auto' ? undefined : dir, "data-control-size": controlSize, "data-surface-variant": variant, "data-label-style": labelStyle, "data-invalid": isInvalid, "data-disabled": disabled || undefined, "data-has-label": Boolean(floatingHint), children: [_jsxs("div", { ref: shellRef, className: "lab-text-field-shell", "data-lab-corners": true, children: [(leadingIcon || leading) && (_jsxs("span", { ref: leadingRef, className: "lab-field-leading", children: [leadingIcon && (_jsx("span", { className: "lab-text-field-icon", "aria-hidden": "true", children: leadingIcon })), leading && _jsx("span", { className: "lab-text-field-affix", children: leading })] })), _jsxs("div", { className: "lab-text-field-edit", "data-always-float": populated || alwaysFloat || undefined, children: [children({ id, describedBy: description, invalid: isInvalid }), floatingHint && (_jsxs("label", { htmlFor: id, className: "lab-text-field-label", children: [floatingHint, required && _jsx("span", { "aria-hidden": "true", children: " *" })] }))] }), trailing && (_jsx("span", { ref: trailingRef, className: "lab-text-field-trailing", children: trailing }))] }), _jsxs("div", { className: "lab-text-field-details", children: [_jsx("span", { id: feedbackId, "aria-live": "polite", children: error || supportingText }), counter != null && _jsx("span", { id: counterId, children: counter })] })] }));
}
//# sourceMappingURL=field-shell.js.map