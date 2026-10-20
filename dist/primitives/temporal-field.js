'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, Clock, ChevronDown, X } from 'lucide-react';
import { LabFieldShell } from './field-shell.js';
import { LabButton, LabIconButton } from './button.js';
import { LabRawInput } from './raw-input.js';
import { LabModal } from './modal.js';
import { LabPopoverSurface } from './popover-surface.js';
import { LabScrollArea } from '../scroll/index.js';
import { LabDock } from '../dock/index.js';
import { LabTemporalFilterEditor } from '../filters/temporal-editor.js';
import { isTemporalRange, normalizeTemporal, validateTemporal, } from '../filters/temporal.js';
import { formatTemporalValue } from '../filters/temporal-format.js';
import { cn } from '../utils.js';
import './temporal-field.css';
/** Full-surface field trigger + shared selection-first editor. Drafts commit only on Apply. */
export const LabTemporalField = React.forwardRef(function LabTemporalField({ type, value, onValueChange, min, max, step, allowOvernight, presets, hint, label, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, variant = 'outlined', controlSize = 'regular', dir, id, name, rangeNames, disabled, readOnly, required, requiredMessage = 'Choose a value.', placeholder, clearable = false, validator, validationMode = 'blur', onValidationChange, onBlur, locale, formatValue, className, 'aria-label': ariaLabel, 'aria-describedby': ariaDescription, }, forwardedRef) {
    const trigger = React.useRef(null);
    React.useImperativeHandle(forwardedRef, () => trigger.current, []);
    const formId = React.useId(), range = isTemporalRange(type);
    const config = { type, min, max, step, allowOvernight, presets };
    const [open, setOpen] = React.useState(false), [draft, setDraft] = React.useState(value), [draftError, setDraftError] = React.useState(null);
    const [message, setMessage] = React.useState(null);
    const touched = React.useRef(false), editing = React.useRef(false);
    const [container, setContainer] = React.useState();
    const [direction, setDirection] = React.useState(dir === 'rtl' ? 'rtl' : 'ltr');
    const valueKey = JSON.stringify(value);
    const validate = React.useCallback((next) => {
        if (readOnly)
            return null;
        const normalized = normalizeTemporal(next);
        return ((required && normalized == null
            ? requiredMessage
            : validateTemporal({ type, min, max, step, allowOvernight }, normalized) ||
                validator?.(normalized)) || null);
    }, [required, requiredMessage, type, min, max, step, allowOvernight, validator, readOnly]);
    const publish = React.useCallback((next) => {
        setMessage(next);
        onValidationChange?.(next);
    }, [onValidationChange]);
    React.useEffect(() => {
        if (touched.current && validationMode !== 'submit')
            publish(validate(value));
    }, [valueKey, value, validationMode, publish, validate]);
    React.useEffect(() => {
        const form = trigger.current?.form;
        const reset = () => {
            touched.current = false;
            publish(null);
            setOpen(false);
            editing.current = false;
        };
        form?.addEventListener('reset', reset);
        return () => form?.removeEventListener('reset', reset);
    }, [publish]);
    const close = () => {
        editing.current = false;
        setOpen(false);
        touched.current = true;
        if (validationMode !== 'submit')
            publish(validate(value));
    };
    const begin = () => {
        if (disabled || readOnly)
            return;
        setContainer(trigger.current?.closest('dialog') || undefined);
        setDirection(getComputedStyle(trigger.current).direction === 'rtl' ? 'rtl' : 'ltr');
        setDraft(value);
        setDraftError(null);
        editing.current = true;
        setOpen(true);
    };
    React.useEffect(() => {
        if (disabled || readOnly) {
            editing.current = false;
            setOpen(false);
        }
    }, [disabled, readOnly]);
    const commit = (next) => {
        const normalized = normalizeTemporal(next);
        onValueChange(normalized);
        touched.current = true;
        if (validationMode !== 'submit')
            publish(validate(normalized));
        editing.current = false;
        setOpen(false);
    };
    const apply = (event) => {
        event.preventDefault();
        const normalized = normalizeTemporal(draft), failure = validate(normalized);
        if (failure) {
            setDraftError(failure);
            return;
        }
        commit(normalized);
    };
    const formatted = (formatValue || ((next) => formatTemporalValue(type, next, locale)))(value);
    const populated = normalizeTemporal(value) != null;
    const floatingHint = hint ?? label;
    const title = floatingHint || ariaLabel || 'Choose date and time';
    const actions = (_jsxs(LabDock, { label: `${title} actions`, children: [_jsx(LabButton, { variant: "text", controlSize: "compact", onClick: () => {
                    setDraft(null);
                    setDraftError(null);
                }, children: "Clear" }), _jsx(LabButton, { variant: "filled", controlSize: "compact", type: "submit", form: formId, children: "Apply" })] }));
    const editor = (_jsxs("form", { id: formId, className: "lab-temporal-field-editor", onSubmit: apply, children: [_jsx(LabTemporalFilterEditor, { config: config, value: draft, onChange: (next) => {
                    setDraft(next);
                    setDraftError(null);
                } }, `${type}-${open}`), draftError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: draftError }))] }));
    return (_jsxs(Popover.Root, { open: open && !range, onOpenChange: (next) => (next ? begin() : close()), children: [_jsx(LabFieldShell, { id: id, hint: hint, label: label, labelStyle: labelStyle, leadingIcon: leadingIcon === undefined ? (type.startsWith('time') ? (_jsx(Clock, {})) : (_jsx(CalendarDays, {}))) : (leadingIcon), leading: leading, trailing: _jsxs(_Fragment, { children: [trailing, clearable && populated && !disabled && !readOnly && (_jsx(LabIconButton, { variant: "text", controlSize: "compact", className: "lab-temporal-field-clear", "aria-label": `Clear ${title}`, onClick: () => {
                                trigger.current?.focus();
                                commit(null);
                            }, children: _jsx(X, { size: 16 }) })), _jsx(ChevronDown, { size: 18, "aria-hidden": "true" })] }), supportingText: supportingText, error: error ?? message, containerClassName: containerClassName, variant: variant, controlSize: controlSize, dir: dir, disabled: disabled, required: required, populated: populated, alwaysFloat: open, describedBy: ariaDescription, children: ({ id: fieldId, describedBy, invalid }) => {
                    const button = (_jsx(LabButton, { ref: trigger, id: fieldId, variant: variant, controlSize: controlSize, className: cn('lab-field-select-control lab-temporal-field-control', className), disabled: disabled, "aria-label": ariaLabel || floatingHint || placeholder || title, "aria-describedby": [describedBy, populated ? `${fieldId}-value` : null].filter(Boolean).join(' ') ||
                            undefined, "aria-invalid": invalid, "aria-required": required || undefined, "aria-readonly": readOnly || undefined, "aria-haspopup": "dialog", "aria-expanded": open, onClick: range ? begin : undefined, onKeyDown: (event) => {
                            if (!range && readOnly && ['Enter', ' ', 'ArrowDown'].includes(event.key))
                                event.preventDefault();
                            if (!readOnly && ['ArrowDown'].includes(event.key)) {
                                event.preventDefault();
                                begin();
                            }
                        }, onBlur: (event) => {
                            if (!editing.current) {
                                touched.current = true;
                                if (validationMode !== 'submit')
                                    publish(validate(value));
                            }
                            onBlur?.(event);
                        }, children: _jsx("span", { id: `${fieldId}-value`, className: "lab-temporal-field-value", children: formatted || (!floatingHint ? placeholder : '') || '\u00a0' }) }));
                    return range || readOnly ? button : _jsx(Popover.Trigger, { asChild: true, children: button });
                } }), _jsx(LabRawInput, { className: "lab-sr-only", tabIndex: -1, "aria-hidden": "true", name: name, disabled: disabled, onChange: () => { }, value: populated ? (typeof value === 'string' ? value : JSON.stringify(value)) : '', required: required && !readOnly, validator: () => validate(value), validationMode: "submit", onValidationChange: publish, onInvalid: (event) => {
                    event.preventDefault();
                    touched.current = true;
                    publish(validate(value));
                    trigger.current?.focus();
                } }), range && rangeNames && (_jsxs(_Fragment, { children: [_jsx(LabRawInput, { type: "hidden", name: rangeNames.from, disabled: disabled, value: value && typeof value === 'object' ? value.from : '' }), _jsx(LabRawInput, { type: "hidden", name: rangeNames.to, disabled: disabled, value: value && typeof value === 'object' ? value.to : '' })] })), _jsx(Popover.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { className: "lab-temporal-field-popover", "aria-label": title, dir: direction, align: "start", sideOffset: 8, collisionPadding: 12, onCloseAutoFocus: (event) => {
                            event.preventDefault();
                            trigger.current?.focus({ preventScroll: true });
                        }, children: _jsx(LabScrollArea, { label: `${title} picker`, contentPadding: 12, bottom: actions, children: editor }) }) }) }), typeof document !== 'undefined' &&
                createPortal(_jsx(LabModal, { open: open && range, label: title, close: close, returnFocusRef: trigger, scrollable: true, fitContent: true, className: `lab-temporal-field-dialog ${type.startsWith('time') ? '' : 'lab-filter-calendar-dialog'}`, bottom: actions, children: _jsx("div", { dir: direction, children: editor }) }), container ?? document.body)] }));
});
function singleField(type) {
    return React.forwardRef((props, ref) => (_jsx(LabTemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(typeof next === 'string' ? next : null) })));
}
function rangeField(type) {
    return React.forwardRef((props, ref) => (_jsx(LabTemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(next && typeof next === 'object' ? next : null) })));
}
export const LabDateField = singleField('date');
export const LabTimeField = singleField('time');
export const LabDateTimeField = singleField('datetime');
export const LabDateRangeField = rangeField('dateRange');
export const LabTimeRangeField = rangeField('timeRange');
export const LabDateTimeRangeField = rangeField('datetimeRange');
//# sourceMappingURL=temporal-field.js.map