'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, Clock, ChevronDown, X } from 'lucide-react';
import { FieldShell } from './field-shell.js';
import { Button, IconButton } from './button.js';
import { RawInput } from './raw-input.js';
import { PopoverSurface } from './popover-surface.js';
import { useFloatingBoundary } from '../menu/boundary.js';
import { TemporalFilterEditor } from '../filters/temporal-editor.js';
import { TemporalDialog } from '../filters/temporal-dialog.js';
import { ToolbarGroup } from '../toolbar.js';
import { isTemporalRange, normalizeTemporal, validateTemporal, } from '../filters/temporal.js';
import { formatTemporalValue } from '../filters/temporal-format.js';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import './temporal-field.css';
import { GlassScope } from '../glass/container.js';
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
export const TemporalField = React.forwardRef(function TemporalField({ type, value, onValueChange, min, max, step, allowOvernight, presets, hint, label, labelStyle = 'outlined', leadingIcon, leading, trailing, supportingText, error, containerClassName, variant = 'outlined', controlSize = 'regular', dir, id, name, rangeNames, disabled, readOnly, required, requiredMessage, placeholder, clearable = false, validator, validationMode = 'blur', onValidationChange, onBlur, locale: localeProp, formatValue, className, 'aria-label': ariaLabel, 'aria-describedby': ariaDescription, }, forwardedRef) {
    const trigger = React.useRef(null);
    React.useImperativeHandle(forwardedRef, () => trigger.current, []);
    const i18n = useI18n();
    const locale = localeProp ?? i18n.locale;
    const formId = React.useId(), range = isTemporalRange(type);
    const config = { type, min, max, step, allowOvernight, presets };
    const [open, setOpen] = React.useState(false), [draft, setDraft] = React.useState(value), [draftError, setDraftError] = React.useState(null);
    const [message, setMessage] = React.useState(null);
    const touched = React.useRef(false), editing = React.useRef(false);
    const [container, setContainer] = React.useState();
    const boundary = useFloatingBoundary();
    const [direction, setDirection] = React.useState(dir === 'rtl' ? 'rtl' : 'ltr');
    const valueKey = JSON.stringify(value);
    const validate = React.useCallback((next) => {
        if (readOnly)
            return null;
        const normalized = normalizeTemporal(next);
        return ((required && normalized == null
            ? (requiredMessage ?? i18n.t('lab.temporal.required'))
            : validateTemporal({ type, min, max, step, allowOvernight }, normalized, i18n.t) ||
                validator?.(normalized)) || null);
    }, [required, requiredMessage, type, min, max, step, allowOvernight, validator, readOnly, i18n.t]);
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
        setContainer(trigger.current?.closest('dialog') || boundary || undefined);
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
    const formatted = (formatValue || ((next) => formatTemporalValue(type, next, locale, i18n.t)))(value);
    const populated = normalizeTemporal(value) != null;
    const floatingHint = hint ?? label;
    const title = floatingHint || ariaLabel || i18n.t('lab.temporal.chooseDateTime');
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
    const actions = instant && normalizeTemporal(draft) == null ? null : (_jsx(GlassScope, { className: "lab-temporal-actions-row", children: _jsxs(ToolbarGroup, { label: i18n.t('lab.temporal.actionsOf', { label: title }), className: "lab-temporal-actions", children: [_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "regular", disabled: normalizeTemporal(draft) == null, onClick: clear, children: i18n.t('lab.temporal.clear') }), !instant && (_jsx(Button, { variant: "filled", appearance: "toolbar", controlSize: "regular", type: "submit", form: formId, children: i18n.t('lab.temporal.apply') }))] }) }));
    const popoverEditor = (_jsxs("form", { id: formId, className: "lab-temporal-field-editor", onSubmit: apply, children: [_jsx(TemporalFilterEditor, { config: config, locale: locale, value: draft, resetKey: open, onChange: changeDraft, footer: actions, onPick: pick }), draftError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: draftError }))] }));
    return (_jsxs(Popover.Root, { open: open && !asDialog, onOpenChange: (next) => (next ? begin() : close()), children: [_jsx(FieldShell, { id: id, hint: hint, label: label, labelStyle: labelStyle, leadingIcon: leadingIcon === undefined ? type.startsWith('time') ? _jsx(Clock, {}) : _jsx(CalendarDays, {}) : leadingIcon, leading: leading, trailing: _jsxs(_Fragment, { children: [trailing, clearable && populated && !disabled && !readOnly && (_jsx(IconButton, { variant: "text", controlSize: "small", className: "lab-temporal-field-clear", "aria-label": `Clear ${title}`, onClick: () => {
                                trigger.current?.focus();
                                commit(null);
                            }, children: _jsx(X, { size: 16 }) })), _jsx(ChevronDown, { size: 18, "aria-hidden": "true" })] }), supportingText: supportingText, error: error ?? message, containerClassName: containerClassName, variant: variant, controlSize: controlSize, dir: dir, disabled: disabled, required: required, populated: populated, alwaysFloat: open, describedBy: ariaDescription, children: ({ id: fieldId, describedBy, invalid }) => {
                    const button = (_jsx(Button, { ref: trigger, id: fieldId, variant: variant, controlSize: controlSize, className: cn('lab-field-select-control lab-temporal-field-control', className), disabled: disabled, "aria-label": ariaLabel || floatingHint || placeholder || title, "aria-describedby": [describedBy, populated ? `${fieldId}-value` : null].filter(Boolean).join(' ') || undefined, "aria-invalid": invalid, "aria-required": required || undefined, "aria-readonly": readOnly || undefined, "aria-haspopup": "dialog", "aria-expanded": open, onClick: asDialog ? begin : undefined, onKeyDown: (event) => {
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
                } }), _jsx(RawInput, { className: "lab-sr-only", tabIndex: -1, "aria-hidden": "true", name: name, disabled: disabled, onChange: () => { }, value: populated ? (typeof value === 'string' ? value : JSON.stringify(value)) : '', required: required && !readOnly, validator: () => validate(value), validationMode: "submit", onValidationChange: publish, onInvalid: (event) => {
                    event.preventDefault();
                    touched.current = true;
                    publish(validate(value));
                    trigger.current?.focus();
                } }), range && rangeNames && (_jsxs(_Fragment, { children: [_jsx(RawInput, { type: "hidden", name: rangeNames.from, disabled: disabled, value: value && typeof value === 'object' ? value.from : '' }), _jsx(RawInput, { type: "hidden", name: rangeNames.to, disabled: disabled, value: value && typeof value === 'object' ? value.to : '' })] })), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { className: "lab-temporal-field-popover", "aria-label": title, dir: direction, align: "start", sideOffset: 8, collisionPadding: 12, collisionBoundary: container, onCloseAutoFocus: (event) => {
                            event.preventDefault();
                            trigger.current?.focus({ preventScroll: true });
                        }, children: !asDialog && popoverEditor }) }) }), typeof document !== 'undefined' &&
                createPortal(_jsx(TemporalDialog, { open: open && asDialog, label: title, close: close, returnFocusRef: trigger, dir: direction, className: "lab-temporal-field-dialog", formId: formId, onSubmit: apply, config: config, locale: locale, value: draft, onChange: changeDraft, onPick: pick, onClear: clear, clearDisabled: normalizeTemporal(draft) == null, showApply: !instant, error: draftError }), container ?? document.body)] }));
});
function singleField(type) {
    return React.forwardRef((props, ref) => (_jsx(TemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(typeof next === 'string' ? next : null) })));
}
function rangeField(type) {
    return React.forwardRef((props, ref) => (_jsx(TemporalField, { ...props, ref: ref, type: type, onValueChange: (next) => props.onValueChange(next && typeof next === 'object' ? next : null) })));
}
/** A calendar day, stored as `YYYY-MM-DD`. */
export const DateField = singleField('date');
/** A time of day, stored as `HH:mm` (or `HH:mm:ss` when `step` is under 60 seconds). */
export const TimeField = singleField('time');
/** A local date and time, stored as `YYYY-MM-DDTHH:mm`. */
export const DateTimeField = singleField('datetime');
/** A range of calendar days, stored as `{ from, to }` dates. */
export const DateRangeField = rangeField('dateRange');
/** A range of times of day; `allowOvernight` lets the end come before the start. */
export const TimeRangeField = rangeField('timeRange');
/** A range of local dates and times. */
export const DateTimeRangeField = rangeField('datetimeRange');
//# sourceMappingURL=temporal-field.js.map