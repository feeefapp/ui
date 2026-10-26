'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils.js';
import { GlassBar, GlassScope } from '../glass/container.js';
import { useGlassMember } from '../glass/member.js';
import { useI18n } from '../i18n.js';
import { IconButton } from './button.js';
import { RawInput } from './raw-input.js';
import { clampNumber, dragValue, fillFraction, isBounded, keyValue, parseNumberExpression, stepDecimals, } from './number-field-core.js';
import './control-variants.css';
import './number-field.css';
const DRAG_THRESHOLD = { mouse: 3, pen: 3, touch: 6 };
/**
 * A Blender-style number field. Drag anywhere on it to scrub the value (mouse, pen or finger; Shift
 * for precision dragging), click without dragging to type, and use arrows, Page Up/Down, Home/End or
 * Backspace (reset) from the keyboard. Typed values accept `+ - * /`, parentheses and `%`.
 */
export const NumberField = React.forwardRef(function NumberField({ label, value: controlled, defaultValue, onValueChange, onValueCommit, min, max, step: stepProp = 1, unit, format, fill, steppers = true, variant = 'elevated', controlSize = 'regular', disabled = false, supportingText, error, validator, validationMode = 'blur', onValidationChange, name, form, className, containerClassName, id, 'aria-describedby': describedBy, }, ref) {
    const { locale, dir } = useI18n();
    const step = Number.isFinite(stepProp) && stepProp > 0 ? stepProp : 1;
    const bounds = { min, max, step };
    const bounded = isBounded(bounds);
    const [local, setLocal] = React.useState(() => clampNumber(defaultValue ?? min ?? 0, bounds));
    const value = controlled === undefined ? local : clampNumber(controlled, bounds);
    const [editing, setEditing] = React.useState(null);
    const [dragging, setDragging] = React.useState(false);
    const host = React.useRef(null);
    const input = React.useRef(null);
    const validity = React.useRef(null);
    const feedbackId = `${React.useId()}-feedback`;
    const [validationError, setValidationError] = React.useState(null);
    const touched = React.useRef(false);
    const drag = React.useRef(null);
    React.useImperativeHandle(ref, () => host.current, []);
    const decimals = stepDecimals(step);
    const display = React.useMemo(() => {
        if (format)
            return format(value);
        return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    }, [format, value, locale, decimals]);
    const valueText = unit ? `${display} ${unit}` : display;
    // The newest value, ahead of a re-render (a blur right after a typed commit validates it).
    const latest = React.useRef(value);
    latest.current = value;
    const reveal = (checked) => {
        const next = validator?.(checked) || null;
        if (next === validationError)
            return;
        setValidationError(next);
        onValidationChange?.(next);
    };
    const message = error || validationError;
    React.useLayoutEffect(() => {
        validity.current?.setCustomValidity(error || validator?.(value) || '');
    });
    const set = (next, commit) => {
        const clamped = clampNumber(next, bounds);
        latest.current = clamped;
        if (controlled === undefined)
            setLocal(clamped);
        if (clamped !== value)
            onValueChange?.(clamped);
        if (commit)
            onValueCommit?.(clamped);
        if (validationMode === 'change' || (touched.current && validationMode === 'blur'))
            reveal(clamped);
        return clamped;
    };
    const startEditing = (initial) => {
        if (disabled)
            return;
        setEditing(initial ?? value.toFixed(decimals));
    };
    React.useLayoutEffect(() => {
        if (editing === null)
            return;
        const el = input.current;
        if (!el)
            return;
        el.focus({ preventScroll: true });
        if (el.value.length > 1)
            el.select();
        else
            el.setSelectionRange(el.value.length, el.value.length);
    }, [editing === null]); // focus once when editing starts
    // Enter and Escape return focus to the field; a blur leaves it where the person moved it.
    const finishEditing = (commit, refocus = true) => {
        if (editing === null)
            return;
        const parsed = commit ? parseNumberExpression(editing) : null;
        setEditing(null);
        if (parsed != null)
            set(parsed, true);
        if (refocus)
            requestAnimationFrame(() => host.current?.focus({ preventScroll: true }));
    };
    // A form reset restores the initial value and hides the error, like a native field.
    React.useEffect(() => {
        const owner = validity.current?.form;
        if (!owner)
            return;
        const reset = () => {
            touched.current = false;
            setValidationError(null);
            onValidationChange?.(null);
            const initial = clampNumber(defaultValue ?? min ?? 0, bounds);
            if (controlled === undefined)
                setLocal(initial);
            else
                onValueChange?.(initial);
        };
        owner.addEventListener('reset', reset);
        return () => owner.removeEventListener('reset', reset);
    });
    const rtl = (host.current ? getComputedStyle(host.current).direction : dir) === 'rtl';
    const onPointerDown = (event) => {
        if (disabled || editing !== null || event.button !== 0)
            return;
        if (event.target.closest('[data-number-stepper]'))
            return;
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = { x: event.clientX, value, width: rect.width, moved: false, pointer: event.pointerType };
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        catch {
            // The pointer is already gone (released before this handler ran); nothing to capture.
        }
    };
    const onPointerMove = (event) => {
        const d = drag.current;
        if (!d)
            return;
        const dx = event.clientX - d.x;
        if (!d.moved) {
            if (Math.abs(dx) < (DRAG_THRESHOLD[d.pointer] ?? 3))
                return;
            d.moved = true;
            d.x = event.clientX; // start scrubbing from here, so crossing the threshold never jumps
            setDragging(true);
            return;
        }
        set(dragValue({ ...bounds, startValue: d.value, dx, width: d.width, fine: event.shiftKey, rtl }), false);
    };
    const endPointer = (event, cancelled) => {
        const d = drag.current;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        if (!d)
            return;
        if (d.moved) {
            setDragging(false);
            onValueCommit?.(value);
        }
        else if (!cancelled)
            startEditing();
    };
    const onKeyDown = (event) => {
        if (disabled || editing !== null)
            return;
        const next = keyValue(event.key, value, bounds, { rtl });
        if (next != null) {
            event.preventDefault();
            set(next, true);
            return;
        }
        if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            startEditing();
        }
        else if ((event.key === 'Backspace' || event.key === 'Delete') && defaultValue !== undefined) {
            event.preventDefault();
            set(defaultValue, true);
        }
        else if (/^[\d.,\-+(٠-٩]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            startEditing(event.key);
        }
    };
    const stepBy = (direction) => set(value + direction * step, true);
    const fraction = (fill ?? bounded) ? fillFraction(value, bounds) : null;
    const description = [describedBy, (message || supportingText) && feedbackId].filter(Boolean).join(' ') || undefined;
    return (
    // The field is a glass bubble: its own container (or a member of the row's, inside one). Its text
    // sits on whatever is behind it, so it takes the bars' legibility floor (tint and blur).
    _jsx(GlassBar, { children: _jsxs(GlassScope, { cornerShape: "round", className: cn('lab-number-field-container', containerClassName), "data-invalid": message ? '' : undefined, onBlur: (event) => {
                if (event.currentTarget.contains(event.relatedTarget))
                    return;
                touched.current = true;
                if (validationMode !== 'submit')
                    reveal(latest.current);
            }, children: [_jsxs(GlassMemberDiv, { hostRef: host, id: id, className: cn('lab-number-field lab-control', className), "data-surface-variant": variant, "data-control-size": controlSize, "data-editing": editing !== null || undefined, "data-dragging": dragging || undefined, "data-disabled": disabled || undefined, "data-lab-corners": true, role: editing !== null ? 'group' : bounded ? 'slider' : 'spinbutton', tabIndex: disabled || editing !== null ? -1 : 0, "aria-label": label, "aria-valuenow": editing !== null ? undefined : value, "aria-valuemin": editing !== null ? undefined : min, "aria-valuemax": editing !== null ? undefined : max, "aria-valuetext": editing !== null ? undefined : valueText, "aria-disabled": disabled || undefined, "aria-invalid": message ? true : undefined, "aria-describedby": description, style: fraction != null ? { '--lab-number-fill': fraction } : undefined, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: (event) => endPointer(event, false), onPointerCancel: (event) => endPointer(event, true), onKeyDown: onKeyDown, children: [fraction != null && _jsx("span", { className: "lab-number-field-fill", "aria-hidden": "true" }), steppers && editing === null && (_jsx(IconButton, { "data-number-stepper": true, className: "lab-number-field-stepper", variant: "text", appearance: "toolbar", controlSize: "small", tabIndex: -1, "aria-label": `Decrease ${label}`, disabled: disabled || (min !== undefined && value <= min), onClick: () => stepBy(-1), children: _jsx(ChevronLeft, { size: 16, className: "lab-dir-flip" }) })), editing === null ? (_jsxs("span", { className: "lab-number-field-row", "aria-hidden": "true", children: [_jsx("span", { className: "lab-number-field-label", children: label }), _jsxs("span", { className: "lab-number-field-value", children: [display, unit && _jsx("span", { className: "lab-number-field-unit", children: unit })] })] })) : (_jsx(RawInput, { ref: input, className: "lab-number-field-input", "aria-label": label, inputMode: "decimal", autoComplete: "off", spellCheck: false, value: editing, onValueChange: setEditing, "aria-invalid": message ? true : undefined, "aria-describedby": description, onBlur: () => finishEditing(true, false), onKeyDown: (event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    finishEditing(true);
                                }
                                else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    finishEditing(false);
                                }
                            } })), steppers && editing === null && (_jsx(IconButton, { "data-number-stepper": true, className: "lab-number-field-stepper", variant: "text", appearance: "toolbar", controlSize: "small", tabIndex: -1, "aria-label": `Increase ${label}`, disabled: disabled || (max !== undefined && value >= max), onClick: () => stepBy(1), children: _jsx(ChevronRight, { size: 16, className: "lab-dir-flip" }) }))] }), (name || validator || error != null) && (
                // Invisible, not `type="hidden"`: hidden inputs skip constraint validation, and this one
                // carries the validator's verdict so an invalid value blocks the form like any field.
                _jsx("input", { ref: validity, className: "lab-number-field-validity", name: name, form: form, value: value, onChange: () => { }, tabIndex: -1, "aria-hidden": "true", autoComplete: "off", onInvalid: (event) => {
                        event.preventDefault();
                        touched.current = true;
                        reveal(latest.current);
                        if (event.currentTarget.form?.querySelector(':invalid') === event.currentTarget)
                            host.current?.focus({ preventScroll: false });
                    } })), _jsx("div", { className: "lab-number-field-details", children: _jsx("span", { id: feedbackId, "aria-live": "polite", children: message || supportingText }) })] }) }));
});
/** The field's own element, a member of the enclosing glass container (the field's GlassScope). */
function GlassMemberDiv({ hostRef, ...props }) {
    const member = useGlassMember(hostRef);
    return _jsx("div", { ...props, ref: hostRef, "data-glass-member": member ? '' : undefined });
}
//# sourceMappingURL=number-field.js.map