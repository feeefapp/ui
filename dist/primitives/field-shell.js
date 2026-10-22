'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import '../system.css';
import './control-variants.css';
import './text-field.css';
/**
 * The field frame on its own: surface, floating hint, icons, affixes, supporting text and
 * counter. It paints and labels; the child control owns editing, selection and validation.
 */
export function FieldShell({ id: suppliedId, label, hint, dir, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, variant = 'outlined', controlSize = 'regular', disabled, required, invalid = false, describedBy, populated, alwaysFloat, counter, children, }) {
    const floatingHint = hint ?? label;
    const shellRef = React.useRef(null);
    const leadingRef = React.useRef(null);
    const trailingRef = React.useRef(null);
    const editRef = React.useRef(null);
    const labelRef = React.useRef(null);
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
    // The floated hint cuts a notch in the outline (like a fieldset legend) instead of covering the
    // border with a patch: the outline's mask needs the label's place and width.
    React.useLayoutEffect(() => {
        const edit = editRef.current;
        const label = labelRef.current;
        if (!edit || !label)
            return;
        const measure = () => {
            const box = edit.getBoundingClientRect();
            const rect = label.getBoundingClientRect();
            // The outline sits 1px outside the control.
            edit.style.setProperty('--lab-field-notch-x', `${rect.left - box.left + 1}px`);
            edit.style.setProperty('--lab-field-notch-width', `${rect.width}px`);
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(label);
        observer?.observe(edit);
        return () => observer?.disconnect();
    }, [floatingHint, required]);
    const generatedId = React.useId();
    const id = suppliedId || generatedId;
    const feedbackId = `${id}-feedback`;
    const counterId = `${id}-counter`;
    const isInvalid = Boolean(error) || invalid;
    const description = [describedBy, (error || supportingText) && feedbackId, counter != null && counterId]
        .filter(Boolean)
        .join(' ') || undefined;
    return (_jsxs("div", { className: cn('lab-text-field', containerClassName), dir: dir === 'auto' ? undefined : dir, "data-control-size": controlSize, "data-surface-variant": variant, "data-label-style": labelStyle, "data-invalid": isInvalid, "data-disabled": disabled || undefined, "data-has-label": Boolean(floatingHint), children: [_jsxs("div", { ref: shellRef, className: "lab-text-field-shell", "data-lab-corners": true, children: [(leadingIcon || leading) && (_jsxs("span", { ref: leadingRef, className: "lab-field-leading", children: [leadingIcon && (_jsx("span", { className: "lab-text-field-icon", "aria-hidden": "true", children: leadingIcon })), leading && _jsx("span", { className: "lab-text-field-affix", children: leading })] })), _jsxs("div", { ref: editRef, className: "lab-text-field-edit", "data-always-float": populated || alwaysFloat || undefined, children: [children({ id, describedBy: description, invalid: isInvalid }), _jsx("span", { className: "lab-text-field-outline", "aria-hidden": "true" }), floatingHint && (_jsxs("label", { ref: labelRef, htmlFor: id, className: "lab-text-field-label", children: [floatingHint, required && _jsx("span", { "aria-hidden": "true", children: " *" })] }))] }), trailing && (_jsx("span", { ref: trailingRef, className: "lab-text-field-trailing", children: trailing }))] }), _jsxs("div", { className: "lab-text-field-details", children: [_jsx("span", { id: feedbackId, "aria-live": "polite", children: error || supportingText }), counter != null && _jsx("span", { id: counterId, children: counter })] })] }));
}
//# sourceMappingURL=field-shell.js.map