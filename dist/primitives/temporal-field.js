'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, Clock, ChevronDown, X } from 'lucide-react';
import { LabFieldShell } from './field-shell.js';
import { LabButton, LabIconButton } from './button.js';
import { LabRawInput } from './raw-input.js';
import { LabPopoverSurface } from './popover-surface.js';
import { LabTemporalFilterEditor } from '../filters/temporal-editor.js';
import { LabTemporalDialog } from '../filters/temporal-dialog.js';
import { LabToolbarGroup } from '../toolbar.js';
import { isTemporalRange, normalizeTemporal, validateTemporal, } from '../filters/temporal.js';
import { formatTemporalValue } from '../filters/temporal-format.js';
import { useLabI18n } from '../i18n.js';
import { cn } from '../utils.js';
import './temporal-field.css';
/** Phones: every picker opens as a dialog (full width, 44px targets) instead of an anchored popover. */
const COMPACT_QUERY = '(max-width: 599px)';
function useCompactViewport() {
    return React.useSyncExternalStore((notify) => {
        const media = window.matchMedia(COMPACT_QUERY);
        media.addEventListener('change', notify);
        return () => media.removeEventListener('change', notify);
    }, () => window.matchMedia(COMPACT_QUERY).matches, () => false);
}
/**
 * A date or time field: a full-surface trigger that opens a selection-first picker with preset
 * chips, calendars, number-field times and optional typed entry. Single values open in a popover
 * (a dialog on phones), ranges in a dialog. A date commits on the day you pick; times, datetimes and
 * ranges commit on Apply.
 */
export const LabTemporalField = React.forwardRef(function LabTemporalField({ type, value, onValueChange, min, max, step, allowOvernight, presets, hint, label, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, variant = 'outlined', controlSize = 'regular', dir, id, name, rangeNames, disabled, readOnly, required, requiredMessage = 'Choose a value.', placeholder, clearable = false, validator, validationMode = 'blur', onValidationChange, onBlur, locale: localeProp, formatValue, className, 'aria-label': ariaLabel, 'aria-describedby': ariaDescription, }, forwardedRef) {
    const trigger = React.useRef(null);
    React.useImperativeHandle(forwardedRef, () => trigger.current, []);
    const i18n = useLabI18n();
    const locale = localeProp ?? i18n.locale;
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
    // A date is complete with one tap: pick it and the field closes. Everything else has parts
    // (time, two ends), so it keeps one Apply.
    const instant = type === 'date';
    const compact = useCompactViewport();
    const asDialog = range || compact;
    const clear = () => {
        if (instant)
            commit(null);
        else {
            setDraft(null);
            setDraftError(null);
        }
    };
    const changeDraft = (next) => {
        setDraft(next);
        setDraftError(null);
    };
    const pick = (next) => {
        if (!instant)
            return;
        const failure = validate(normalizeTemporal(next));
        if (failure)
            setDraftError(failure);
        else
            commit(next);
    };
    // Popovers end their footer row with one glass group. A date with nothing to clear has no
    // actions at all: the day itself is the action.
    const actions = instant && normalizeTemporal(draft) == null ? null : (_jsxs(LabToolbarGroup, { label: `${title} actions`, className: "lab-temporal-actions", children: [_jsx(LabButton, { variant: "text", appearance: "toolbar", controlSize: "compact", disabled: normalizeTemporal(draft) == null, onClick: clear, children: "Clear" }), !instant && (_jsx(LabButton, { variant: "filled", appearance: "toolbar", controlSize: "compact", type: "submit", form: formId, children: "Apply" }))] }));
    const popoverEditor = (_jsxs("form", { id: formId, className: "lab-temporal-field-editor", onSubmit: apply, children: [_jsx(LabTemporalFilterEditor, { config: config, locale: locale, value: draft, resetKey: open, onChange: changeDraft, footer: actions, onPick: pick }), draftError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: draftError }))] }));
    return (_jsxs(Popover.Root, { open: open && !asDialog, onOpenChange: (next) => (next ? begin() : close()), children: [_jsx(LabFieldShell, { id: id, hint: hint, label: label, labelStyle: labelStyle, leadingIcon: leadingIcon === undefined ? type.startsWith('time') ? _jsx(Clock, {}) : _jsx(CalendarDays, {}) : leadingIcon, leading: leading, trailing: _jsxs(_Fragment, { children: [trailing, clearable && populated && !disabled && !readOnly && (_jsx(LabIconButton, { variant: "text", controlSize: "compact", className: "lab-temporal-field-clear", "aria-label": `Clear ${title}`, onClick: () => {
                                trigger.current?.focus();
                                commit(null);
                            }, children: _jsx(X, { size: 16 }) })), _jsx(ChevronDown, { size: 18, "aria-hidden": "true" })] }), supportingText: supportingText, error: error ?? message, containerClassName: containerClassName, variant: variant, controlSize: controlSize, dir: dir, disabled: disabled, required: required, populated: populated, alwaysFloat: open, describedBy: ariaDescription, children: ({ id: fieldId, describedBy, invalid }) => {
                    const button = (_jsx(LabButton, { ref: trigger, id: fieldId, variant: variant, controlSize: controlSize, className: cn('lab-field-select-control lab-temporal-field-control', className), disabled: disabled, "aria-label": ariaLabel || floatingHint || placeholder || title, "aria-describedby": [describedBy, populated ? `${fieldId}-value` : null].filter(Boolean).join(' ') || undefined, "aria-invalid": invalid, "aria-required": required || undefined, "aria-readonly": readOnly || undefined, "aria-haspopup": "dialog", "aria-expanded": open, onClick: asDialog ? begin : undefined, onKeyDown: (event) => {
                            if (!asDialog && readOnly && ['Enter', ' ', 'ArrowDown'].includes(event.key))
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
                    return asDialog || readOnly ? button : _jsx(Popover.Trigger, { asChild: true, children: button });
                } }), _jsx(LabRawInput, { className: "lab-sr-only", tabIndex: -1, "aria-hidden": "true", name: name, disabled: disabled, onChange: () => { }, value: populated ? (typeof value === 'string' ? value : JSON.stringify(value)) : '', required: required && !readOnly, validator: () => validate(value), validationMode: "submit", onValidationChange: publish, onInvalid: (event) => {
                    event.preventDefault();
                    touched.current = true;
                    publish(validate(value));
                    trigger.current?.focus();
                } }), range && rangeNames && (_jsxs(_Fragment, { children: [_jsx(LabRawInput, { type: "hidden", name: rangeNames.from, disabled: disabled, value: value && typeof value === 'object' ? value.from : '' }), _jsx(LabRawInput, { type: "hidden", name: rangeNames.to, disabled: disabled, value: value && typeof value === 'object' ? value.to : '' })] })), _jsx(Popover.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { className: "lab-temporal-field-popover", "aria-label": title, dir: direction, align: "start", sideOffset: 8, collisionPadding: 12, onCloseAutoFocus: (event) => {
                            event.preventDefault();
                            trigger.current?.focus({ preventScroll: true });
                        }, children: !asDialog && popoverEditor }) }) }), typeof document !== 'undefined' &&
                createPortal(_jsx(LabTemporalDialog, { open: open && asDialog, label: title, close: close, returnFocusRef: trigger, dir: direction, className: "lab-temporal-field-dialog", formId: formId, onSubmit: apply, config: config, locale: locale, value: draft, onChange: changeDraft, onPick: pick, onClear: clear, clearDisabled: normalizeTemporal(draft) == null, showApply: !instant, error: draftError }), container ?? document.body)] }));
});
function singleField(type) {
    return React.forwardRef((props, ref) => (_jsx(LabTemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(typeof next === 'string' ? next : null) })));
}
function rangeField(type) {
    return React.forwardRef((props, ref) => (_jsx(LabTemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(next && typeof next === 'object' ? next : null) })));
}
/** A calendar day, stored as `YYYY-MM-DD`. */
export const LabDateField = singleField('date');
/** A time of day, stored as `HH:mm` (or `HH:mm:ss` when `step` is under 60 seconds). */
export const LabTimeField = singleField('time');
/** A local date and time, stored as `YYYY-MM-DDTHH:mm`. */
export const LabDateTimeField = singleField('datetime');
/** A range of calendar days, stored as `{ from, to }` dates. */
export const LabDateRangeField = rangeField('dateRange');
/** A range of times of day; `allowOvernight` lets the end come before the start. */
export const LabTimeRangeField = rangeField('timeRange');
/** A range of local dates and times. */
export const LabDateTimeRangeField = rangeField('datetimeRange');
//# sourceMappingURL=temporal-field.js.map