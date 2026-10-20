'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { LabRawInput } from './raw-input.js';
import { LabFieldShell } from './field-shell.js';
export const LabTextField = React.forwardRef(({ label, hint, controlSize = 'regular', variant = 'outlined', labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, showCounter = false, containerClassName, className, 'id': suppliedId, onValidationChange, onValueChange, 'aria-describedby': describedBy, ...props }, ref) => {
    const [validationError, setValidationError] = React.useState(null);
    const [length, setLength] = React.useState(String(props.value ?? props.defaultValue ?? '').length);
    const populated = props.value !== undefined ? String(props.value ?? '').length > 0 : length > 0;
    const message = error ?? validationError;
    const handleValidation = React.useCallback((next) => {
        setValidationError(next);
        onValidationChange?.(next);
    }, [onValidationChange]);
    return (_jsx(LabFieldShell, { id: suppliedId, label: label, hint: hint, dir: props.dir, variant: variant, controlSize: controlSize, labelStyle: labelStyle, leadingIcon: leadingIcon, leading: leading, trailing: trailing, supportingText: supportingText, error: message, containerClassName: containerClassName, disabled: props.disabled, required: props.required, describedBy: describedBy, invalid: props['aria-invalid'] === true || props['aria-invalid'] === 'true', alwaysFloat: Boolean(props.type &&
            !['text', 'email', 'tel', 'url', 'search', 'password', 'number'].includes(props.type)), counter: showCounter ? (_jsxs(_Fragment, { children: [props.value !== undefined ? String(props.value ?? '').length : length, props.maxLength != null ? ` / ${props.maxLength}` : ''] })) : undefined, children: ({ id, describedBy: description, invalid }) => (_jsx(LabRawInput, { ...props, error: error, value: props.value === null ? '' : props.value, ref: ref, id: id, className: cn('lab-raw-input', className), dir: props.dir === 'auto' && !populated ? undefined : props.dir, placeholder: (hint ?? label) ? ' ' : props.placeholder || ' ', "aria-invalid": invalid || props['aria-invalid'], "aria-describedby": description, onValidationChange: handleValidation, onValueChange: (value) => {
                setLength(value.length);
                onValueChange?.(value);
            } })) }));
});
LabTextField.displayName = 'LabTextField';
//# sourceMappingURL=text-field.js.map