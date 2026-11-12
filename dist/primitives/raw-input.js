'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import './raw-input.css';
/**
 * An unpainted native `<input>` or `<textarea>` with the kit's validation and auto-growing
 * lines. Native selection, IME, autofill and form semantics stay intact. Use it inside bespoke
 * editors that draw their own surface; use `TextField` everywhere else.
 */
export const RawInput = React.forwardRef(({ multiline = false, autoResize = true, minLines = 1, maxLines, validator, error, validationMode = 'blur', onValidationChange, onValueChange, onChange, onBlur, onInvalid, style, className, ...props }, forwardedRef) => {
    const node = React.useRef(null);
    const touched = React.useRef(false);
    const resize = React.useCallback(() => {
        const el = node.current;
        if (!el || !multiline || !autoResize)
            return;
        const textarea = el;
        const computed = getComputedStyle(textarea);
        const line = Number.parseFloat(computed.lineHeight) || 24;
        const padding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
        const border = Number.parseFloat(computed.borderTopWidth) + Number.parseFloat(computed.borderBottomWidth);
        const minimum = Math.max(1, minLines);
        const maximum = maxLines == null ? Infinity : Math.max(minimum, maxLines);
        textarea.style.height = '0px';
        const height = Math.max(line * minimum + padding, Math.min(textarea.scrollHeight, line * maximum + padding));
        textarea.style.height = `${height + border}px`;
        textarea.style.overflowY = textarea.scrollHeight > height ? 'auto' : 'hidden';
    }, [multiline, minLines, maxLines, autoResize]);
    const validate = React.useCallback((el, reveal) => {
        el.setCustomValidity(error || validator?.(el.value) || '');
        if (reveal)
            onValidationChange?.(el.validity.valid ? null : el.validationMessage);
    }, [validator, error, onValidationChange]);
    React.useLayoutEffect(() => {
        const el = node.current;
        if (el)
            validate(el, touched.current && validationMode !== 'submit');
        resize();
    }, [props.value, validate, resize, validationMode]);
    React.useEffect(() => {
        const el = node.current;
        const form = el?.form;
        const reset = () => {
            touched.current = false;
            onValidationChange?.(null);
            requestAnimationFrame(() => {
                if (el) {
                    validate(el, false);
                    onValueChange?.(el.value);
                }
                resize();
            });
        };
        form?.addEventListener('reset', reset);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        if (el)
            observer?.observe(el);
        return () => {
            form?.removeEventListener('reset', reset);
            observer?.disconnect();
        };
    }, [resize, validate, onValidationChange, onValueChange]);
    const shared = {
        ...props,
        className: ['lab-raw-editor', className].filter(Boolean).join(' '),
        ref: (el) => {
            node.current = el;
            if (typeof forwardedRef === 'function')
                forwardedRef(el);
            else if (forwardedRef)
                forwardedRef.current = el;
        },
        style: { ...style, ...(multiline ? { resize: 'none' } : {}) },
        onChange: (event) => {
            validate(event.currentTarget, validationMode === 'change' || (touched.current && validationMode === 'blur'));
            resize();
            onValueChange?.(event.currentTarget.value);
            onChange?.(event);
        },
        onBlur: (event) => {
            touched.current = true;
            validate(event.currentTarget, validationMode !== 'submit');
            onBlur?.(event);
        },
        onInvalid: (event) => {
            touched.current = true;
            onValidationChange?.(event.currentTarget.validationMessage);
            onInvalid?.(event);
        },
    };
    return multiline ? (_jsx("textarea", { ...shared, rows: Math.max(1, minLines) })) : (_jsx("input", { ...shared }));
});
RawInput.displayName = 'RawInput';
//# sourceMappingURL=raw-input.js.map