'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LabPopoverSurface } from './popover-surface.js';
import * as React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../utils.js';
import { LabFieldShell } from './field-shell.js';
import { LabRawInput } from './raw-input.js';
const EMPTY = '__lab_natural__';
/**
 * A single-choice dropdown in the same field frame as `LabTextField`: floating hint, icons,
 * supporting text and validation. The menu opens in a popover; options are `LabOption`.
 */
export function LabSelect({ children, value: suppliedValue, onValueChange, className, variant = 'elevated', controlSize = 'regular', label, hint, dir, placeholder, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, name, required, requiredMessage = 'Choose an option.', validator, validationMode = 'blur', onValidationChange, onBlur, ...props }) {
    const value = suppliedValue ?? '';
    const floatingHint = hint ?? label;
    const touched = React.useRef(false);
    const [validationError, setValidationError] = React.useState(null);
    const validateValue = React.useCallback((next) => (required && !next ? requiredMessage : validator?.(next)) || null, [required, requiredMessage, validator]);
    const publishError = React.useCallback((next) => {
        setValidationError(next);
        onValidationChange?.(next);
    }, [onValidationChange]);
    const validate = React.useCallback((next) => publishError(validateValue(next)), [publishError, validateValue]);
    React.useEffect(() => {
        if (touched.current && validationMode !== 'submit')
            validate(value);
    }, [value, validate, validationMode]);
    const decorated = Boolean(floatingHint ||
        placeholder ||
        leadingIcon ||
        leading ||
        trailing ||
        supportingText ||
        error ||
        validationError ||
        required ||
        validator);
    const message = error ?? validationError;
    const trigger = React.useRef(null);
    React.useEffect(() => {
        const form = trigger.current?.form;
        const reset = () => {
            touched.current = false;
            publishError(null);
        };
        form?.addEventListener('reset', reset);
        return () => form?.removeEventListener('reset', reset);
    }, [publishError]);
    const [resolvedDirection, setResolvedDirection] = React.useState(dir === 'rtl' ? 'rtl' : 'ltr');
    React.useLayoutEffect(() => {
        const sync = () => {
            const inherited = trigger.current?.parentElement
                ? getComputedStyle(trigger.current.parentElement).direction
                : 'ltr';
            setResolvedDirection(dir === 'ltr' || dir === 'rtl' ? dir : inherited === 'rtl' ? 'rtl' : 'ltr');
        };
        sync();
        const observer = new MutationObserver(sync);
        let ancestor = trigger.current?.parentElement || null;
        while (ancestor) {
            observer.observe(ancestor, { attributes: true, attributeFilter: ['dir', 'class', 'style'] });
            ancestor = ancestor.parentElement;
        }
        return () => observer.disconnect();
    }, [dir]);
    const [container, setContainer] = React.useState();
    // Radix unmounts Select content immediately, so hold it open while it fades.
    const [open, setOpen] = React.useState(false), [closing, setClosing] = React.useState(false);
    const closeTimer = React.useRef(0);
    React.useEffect(() => () => clearTimeout(closeTimer.current), []);
    React.useEffect(() => {
        if (!props.disabled)
            return;
        clearTimeout(closeTimer.current);
        setClosing(false);
        setOpen(false);
    }, [props.disabled]);
    return (_jsxs(Select.Root, { dir: resolvedDirection, value: value || EMPTY, onValueChange: (next) => {
            if (!closing && !props.disabled) {
                const selected = next === EMPTY ? '' : next;
                onValueChange(selected);
                if (validationMode === 'change' || (touched.current && validationMode === 'blur'))
                    validate(selected);
            }
        }, open: open, onOpenChange: (next) => {
            clearTimeout(closeTimer.current);
            if (next) {
                setContainer(trigger.current?.closest('dialog') || undefined);
                setClosing(false);
                setOpen(true);
                return;
            }
            touched.current = true;
            if (validationMode !== 'submit')
                validate(value);
            setClosing(true);
            closeTimer.current = window.setTimeout(() => {
                setOpen(false);
                setClosing(false);
            }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 140);
        }, disabled: props.disabled, children: [decorated ? (_jsx(LabFieldShell, { id: props.id, label: label, hint: hint, dir: dir, labelStyle: labelStyle, variant: variant, controlSize: controlSize, leadingIcon: leadingIcon, leading: leading, trailing: trailing, supportingText: supportingText, error: message, containerClassName: containerClassName, disabled: props.disabled, required: required, describedBy: props['aria-describedby'], invalid: props['aria-invalid'] === true || props['aria-invalid'] === 'true', populated: Boolean(value), children: ({ id, describedBy, invalid }) => (_jsxs(Select.Trigger, { ref: trigger, id: id, className: cn('lab-field-select-control', className), "aria-label": props['aria-label'], "aria-labelledby": props['aria-labelledby'], "aria-describedby": describedBy, "aria-invalid": invalid || props['aria-invalid'], "aria-required": required || undefined, onBlur: (event) => {
                        if (!open) {
                            touched.current = true;
                            if (validationMode !== 'submit')
                                validate(value);
                        }
                        onBlur?.(event);
                    }, children: [_jsx("span", { className: "lab-field-select-value", children: _jsx(Select.Value, { children: !value && !floatingHint && placeholder ? placeholder : undefined }) }), _jsx(Select.Icon, { children: _jsx(ChevronDown, { size: 18, "aria-hidden": "true" }) })] })) })) : (_jsxs(Select.Trigger, { ref: trigger, className: cn('lab-select lab-control', className), "aria-label": props['aria-label'], "aria-labelledby": props['aria-labelledby'], "aria-describedby": props['aria-describedby'], "aria-invalid": props['aria-invalid'], "aria-required": required || undefined, id: props.id, "data-surface-variant": variant, "data-control-size": controlSize, "data-lab-corners": true, onBlur: (event) => {
                    if (!open) {
                        touched.current = true;
                        if (validationMode !== 'submit')
                            validate(value);
                    }
                    onBlur?.(event);
                }, children: [_jsx(Select.Value, { children: !value && !floatingHint && placeholder ? placeholder : undefined }), _jsx(Select.Icon, { children: _jsx(ChevronDown, { size: 18, "aria-hidden": "true" }) })] })), (required || validator || name || error) && (_jsx(LabRawInput, { className: "lab-sr-only", tabIndex: -1, "aria-hidden": "true", value: value, onChange: () => { }, name: name, required: required, disabled: props.disabled, error: error, validator: validateValue, validationMode: "submit", onValidationChange: publishError, onInvalid: (event) => {
                    event.preventDefault();
                    touched.current = true;
                    trigger.current?.focus();
                } })), _jsx(Select.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Select.Content, { className: "lab-select-menu", "data-lab-corners": true, "data-closing": closing || undefined, inert: closing || undefined, position: "popper", sideOffset: 6, collisionPadding: 12, collisionBoundary: container, children: _jsx(Select.Viewport, { children: children }) }) }) })] }));
}
/** One choice in a `LabSelect` menu. A check marks the selected option. */
export function LabOption({ value, children, }) {
    return (_jsxs(Select.Item, { "data-lab-corners": true, className: "lab-select-option", value: (value ?? String(children)) || EMPTY, children: [_jsx(Select.ItemText, { children: children }), _jsx(Select.ItemIndicator, { children: _jsx(Check, { size: 18, "aria-hidden": "true" }) })] }));
}
//# sourceMappingURL=select.js.map