'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../utils.js';
import './choice.css';
function Choice({ kind, forwardedRef, label, description, error, controlSize = 'regular', containerClassName, indeterminate = false, onCheckedChange, className, 'id': suppliedId, onChange, 'aria-describedby': describedBy, ...props }) {
    const generated = React.useId();
    const id = suppliedId || generated;
    const node = React.useRef(null);
    React.useLayoutEffect(() => {
        if (node.current) {
            node.current.indeterminate = kind === 'checkbox' && indeterminate;
            node.current.setCustomValidity(error || '');
        }
    }, [kind, indeterminate, error]);
    return (_jsxs("label", { className: cn('lab-choice', containerClassName), "data-kind": kind, "data-control-size": controlSize, "data-disabled": props.disabled || undefined, "data-invalid": Boolean(error) || undefined, "data-bare": label || description || error ? undefined : '', children: [_jsx("input", { ...props, type: kind, id: id, ref: (el) => {
                    node.current = el;
                    if (el)
                        el.indeterminate = kind === 'checkbox' && indeterminate;
                    if (typeof forwardedRef === 'function')
                        forwardedRef(el);
                    else if (forwardedRef)
                        forwardedRef.current = el;
                }, className: cn('lab-choice-input', className), "aria-labelledby": props['aria-labelledby'] || (!props['aria-label'] && label ? `${id}-label` : undefined), "aria-checked": kind === 'checkbox' && indeterminate ? 'mixed' : props['aria-checked'], "aria-invalid": error ? true : props['aria-invalid'], "aria-describedby": [describedBy, description && `${id}-description`, error && `${id}-error`]
                    .filter(Boolean)
                    .join(' ') || undefined, onChange: (event) => {
                    onCheckedChange?.(event.currentTarget.checked);
                    onChange?.(event);
                } }), _jsx("span", { className: "lab-choice-mark", "aria-hidden": "true", children: kind === 'checkbox' ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "lab-choice-check", size: 14, strokeWidth: 2.5 }), _jsx(Minus, { className: "lab-choice-mixed", size: 14, strokeWidth: 2.5 })] })) : (_jsx("span", { className: "lab-choice-dot" })) }), (label || description || error) && (_jsxs("span", { className: "lab-choice-copy", children: [label && (_jsxs("span", { id: `${id}-label`, children: [label, props.required && kind === 'checkbox' && _jsx("span", { "aria-hidden": "true", children: " *" })] })), description && _jsx("small", { id: `${id}-description`, children: description }), error && (_jsx("small", { id: `${id}-error`, className: "lab-choice-error", "aria-live": "polite", children: error }))] }))] }));
}
/** A native checkbox with a label, description, error and indeterminate state. */
export const Checkbox = React.forwardRef((props, ref) => (_jsx(Choice, { ...props, kind: "checkbox", forwardedRef: ref })));
Checkbox.displayName = 'Checkbox';
/** A single native radio with a label and description. Prefer `RadioGroup`, which names and labels the set. */
export const Radio = React.forwardRef((props, ref) => (_jsx(Choice, { ...props, kind: "radio", forwardedRef: ref })));
Radio.displayName = 'Radio';
/**
 * A labelled set of mutually exclusive choices. Native radios own keyboard navigation, form
 * submission and reset; the `<fieldset>` and `<legend>` own the group label.
 */
export const RadioGroup = React.forwardRef(({ label, options, value, defaultValue, onValueChange, name, form, required, error, description, controlSize, className, 'aria-describedby': describedBy, ...props }, ref) => {
    const id = React.useId();
    const group = React.useRef(null);
    React.useLayoutEffect(() => {
        group.current
            ?.querySelectorAll('input[type="radio"]')
            .forEach((input) => input.setCustomValidity(error || ''));
    }, [error, options]);
    return (_jsxs("fieldset", { ...props, ref: (el) => {
            group.current = el;
            if (typeof ref === 'function')
                ref(el);
            else if (ref)
                ref.current = el;
        }, form: form, className: cn('lab-radio-group', className), "aria-invalid": error ? true : props['aria-invalid'], "aria-describedby": [describedBy, description && `${id}-description`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined, children: [_jsxs("legend", { children: [label, required && _jsx("span", { "aria-hidden": "true", children: " *" })] }), description && _jsx("p", { id: `${id}-description`, children: description }), _jsx("div", { className: "lab-radio-group-options", children: options.map((option) => (_jsx(Radio, { label: option.label, description: option.description, value: option.value, name: name || id, form: form, checked: value === undefined ? undefined : value === option.value, defaultChecked: value === undefined ? defaultValue === option.value : undefined, disabled: props.disabled || option.disabled, required: required, controlSize: controlSize, "aria-describedby": error ? `${id}-error` : undefined, "aria-invalid": error ? true : undefined, onCheckedChange: (checked) => {
                        if (checked)
                            onValueChange?.(option.value);
                    } }, option.value))) }), error && (_jsx("p", { id: `${id}-error`, className: "lab-choice-error", "aria-live": "polite", children: error }))] }));
});
RadioGroup.displayName = 'RadioGroup';
//# sourceMappingURL=choice.js.map