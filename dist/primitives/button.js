import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { PixelTexture, PixelLoader } from '../pixel-art.js';
import { legacyButtonHasTexture } from './button-compat.js';
import { glassGlowRadius } from '../glass/press.js';
import '../system.css';
import './control-variants.css';
/** Variants whose painted shape grows a little while pressed (CONTENT_PRESS_SCALE). */
const CONTENT_PRESS = new Set(['filled', 'tonal', 'elevated', 'outlined', 'destructive', 'secondary']);
/**
 * Puts the touch glow of a pressed glass button under the pointer: its centre in the button's own
 * pixels and how far it spreads (`glassGlowRadius`). The press itself is CSS (`:active`, system.css).
 */
function placePressGlow(event) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    el.style.setProperty('--lab-press-x', `${(event.clientX - rect.left) / scale}px`);
    el.style.setProperty('--lab-press-y', `${(event.clientY - rect.top) / scale}px`);
    el.style.setProperty('--lab-press-glow-to', `${glassGlowRadius(el.offsetWidth)}px`);
}
/**
 * A native `<button>` (or, with `asChild`, your link) painted by one of the emphasis variants. A
 * press answers like iOS: toolbar (glass) buttons swell and glow under the finger, filled, tonal,
 * elevated, outlined and destructive buttons grow a little; inside a glass bubble the bubble answers
 * instead. Reduced motion turns it off.
 */
export const Button = React.forwardRef(({ className, children, loading, variant, controlSize = 'regular', iconSize = 'regular', appearance = 'default', type = 'button', size, asChild = false, ...props }, ref) => {
    const resolvedVariant = variant === 'primary' ? 'filled' : variant;
    const filled = variant === 'primary' ||
        variant === 'filled' ||
        (!variant && legacyButtonHasTexture(className));
    const disabled = Boolean(props.disabled || loading);
    const press = !variant
        ? undefined
        : appearance === 'toolbar'
            ? 'glass'
            : CONTENT_PRESS.has(variant)
                ? 'content'
                : undefined;
    const Component = asChild ? Slot : 'button';
    const nativeButton = !asChild || (React.isValidElement(children) && children.type === 'button');
    // Slot normally invokes child handlers first. Guard the actual child during
    // capture so a disabled link cannot navigate or run either owner's action.
    const stopActivation = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    const stopActivationKey = (event) => {
        if (event.key === 'Enter' || event.key === ' ')
            stopActivation(event);
    };
    let content = children;
    if (asChild && disabled) {
        const child = React.Children.only(children);
        content = React.cloneElement(child, {
            'href': undefined,
            'tabIndex': -1,
            'aria-disabled': true,
            'onClickCapture': stopActivation,
            'onAuxClickCapture': stopActivation,
            'onKeyDownCapture': (event) => {
                if (event.key === 'Enter' || event.key === ' ')
                    stopActivation(event);
                else
                    child.props.onKeyDownCapture?.(event);
            },
        });
    }
    return (_jsx(Component, { ref: ref, type: nativeButton ? type : undefined, className: cn('lab-control', className), ...props, "data-legacy-size": !variant ? size : undefined, "data-variant": resolvedVariant, "data-surface-variant": resolvedVariant &&
            ['filled', 'tonal', 'elevated', 'outlined', 'text'].includes(resolvedVariant)
            ? resolvedVariant
            : undefined, "data-control-size": variant ? controlSize : undefined, "data-icon-size": controlSize === 'icon' ? iconSize : undefined, "data-control-appearance": variant ? appearance : undefined, "data-loading": loading || undefined, "data-press": press, onPointerDown: (event) => {
            if (press === 'glass')
                placePressGlow(event);
            props.onPointerDown?.(event);
        }, disabled: nativeButton ? disabled : undefined, onClickCapture: disabled ? stopActivation : props.onClickCapture, onAuxClickCapture: disabled ? stopActivation : props.onAuxClickCapture, onKeyDownCapture: disabled ? stopActivationKey : props.onKeyDownCapture, "aria-disabled": disabled || props['aria-disabled'], "data-disabled": disabled || undefined, "aria-busy": loading || undefined, "data-lab-corners": true, children: asChild ? (content) : (_jsxs(_Fragment, { children: [filled && _jsx(PixelTexture, { variant: "corner", seed: className || 'control' }), loading && _jsx(PixelLoader, { size: 16, decorative: true }), loading && controlSize === 'icon' ? null : withLabels(children)] })) }));
});
Button.displayName = 'Button';
/**
 * Wraps each run of text children (strings and numbers, like `Save {count}`) in one
 * `.lab-control-label`, so the label can end in an ellipsis when the button's width is bounded.
 */
function withLabels(children) {
    const out = [];
    let run = [];
    const flush = () => {
        if (run.length)
            out.push(_jsx("span", { className: "lab-control-label", children: run }, `label-${out.length}`));
        run = [];
    };
    // toArray keys every element, so the returned list never warns.
    for (const child of React.Children.toArray(children)) {
        if (typeof child === 'string' || typeof child === 'number')
            run.push(child);
        else {
            flush();
            out.push(child);
        }
    }
    flush();
    return out;
}
/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export const IconButton = React.forwardRef(({ controlSize = 'regular', variant = 'text', ...props }, ref) => (_jsx(Button, { ...props, ref: ref, variant: variant, controlSize: "icon", iconSize: controlSize })));
IconButton.displayName = 'IconButton';
//# sourceMappingURL=button.js.map