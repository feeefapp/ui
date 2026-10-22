import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { PixelTexture } from '../pixel-art.js';
import './popover-surface.css';
/**
 * The shared opaque material for menus and popovers: surface, border, group corners and a faint
 * animated pixel grain. Paint only; the owner (usually Radix) keeps positioning and interaction.
 */
export const PopoverSurface = React.forwardRef(({ asChild = false, seed = 'lab-popover', className, children, ...props }, ref) => {
    const decoration = (_jsx("div", { className: "lab-popover-decoration", "aria-hidden": "true", children: _jsx(PixelTexture, { variant: "grain", density: "sparse", seed: seed, animated: true }) }));
    const shared = {
        ...props,
        ref,
        'className': cn('lab-popover-surface', className),
        'data-lab-corners': true,
    };
    if (asChild) {
        const child = React.Children.only(children);
        return (_jsx(Slot, { ...shared, children: React.cloneElement(child, undefined, _jsxs(_Fragment, { children: [decoration, child.props.children] })) }));
    }
    return (_jsxs("div", { ...shared, children: [decoration, children] }));
});
PopoverSurface.displayName = 'PopoverSurface';
//# sourceMappingURL=popover-surface.js.map