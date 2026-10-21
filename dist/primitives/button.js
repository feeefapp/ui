import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { PixelTexture, PixelLoader } from '../pixel-art.js';
import { legacyButtonHasTexture } from './button-compat.js';
import '../system.css';
import './control-variants.css';
export const LabButton = React.forwardRef(({ className, children, loading, variant, controlSize = 'regular', iconSize = 'regular', appearance = 'default', type = 'button', size, asChild = false, ...props }, ref) => {
    const resolvedVariant = variant === 'primary' ? 'filled' : variant;
    const filled = variant === 'primary' ||
        variant === 'filled' ||
        (!variant && legacyButtonHasTexture(className));
    const disabled = Boolean(props.disabled || loading);
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
            : undefined, "data-control-size": variant ? controlSize : undefined, "data-icon-size": controlSize === 'icon' ? iconSize : undefined, "data-control-appearance": variant ? appearance : undefined, "data-loading": loading || undefined, disabled: nativeButton ? disabled : undefined, onClickCapture: disabled ? stopActivation : props.onClickCapture, onAuxClickCapture: disabled ? stopActivation : props.onAuxClickCapture, onKeyDownCapture: disabled ? stopActivationKey : props.onKeyDownCapture, "aria-disabled": disabled || props['aria-disabled'], "data-disabled": disabled || undefined, "aria-busy": loading || undefined, "data-lab-corners": true, children: asChild ? (content) : (_jsxs(_Fragment, { children: [filled && _jsx(PixelTexture, { variant: "corner", seed: className || 'control' }), loading && _jsx(PixelLoader, { size: 16, decorative: true }), loading && controlSize === 'icon' ? null : children] })) }));
});
LabButton.displayName = 'LabButton';
/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export const LabIconButton = React.forwardRef(({ controlSize = 'regular', variant = 'text', ...props }, ref) => (_jsx(LabButton, { ...props, ref: ref, variant: variant, controlSize: "icon", iconSize: controlSize })));
LabIconButton.displayName = 'LabIconButton';
//# sourceMappingURL=button.js.map