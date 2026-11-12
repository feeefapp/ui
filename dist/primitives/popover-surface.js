import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { GlassContainer } from '../glass/container.js';
import { useGlassMember } from '../glass/member.js';
import './popover-surface.css';
/** The popover's one glass shape: it fills the surface, behind its content. */
function PopoverGlassShape() {
    const element = React.useRef(null);
    const member = useGlassMember(element);
    return _jsx("div", { ref: element, className: "lab-popover-glass__shape", "data-glass-member": member ? '' : undefined });
}
/**
 * The shared material for popovers (pickers, editors, settings panels, the model ladder): one glass
 * shape in the thick menu material (GlassContainer `material="menu"`: hairline, rim light and lens,
 * veiled enough to carry text over anything), drawn behind the content. Paint only; the owner
 * (usually Radix) keeps positioning and interaction. Menus (a trigger that opens a list of choices)
 * use `MenuSurface`.
 */
export const PopoverSurface = React.forwardRef(({ asChild = false, className, children, ...props }, ref) => {
    const glass = (_jsx(GlassContainer, { className: "lab-popover-glass", material: "menu", interactive: false, adaptive: false, "aria-hidden": "true", children: _jsx(PopoverGlassShape, {}) }));
    const shared = {
        ...props,
        ref,
        'className': cn('lab-popover-surface', className),
        'data-lab-corners': true,
    };
    if (asChild) {
        const child = React.Children.only(children);
        return (_jsx(Slot, { ...shared, children: React.cloneElement(child, undefined, _jsxs(_Fragment, { children: [glass, child.props.children] })) }));
    }
    return (_jsxs("div", { ...shared, children: [glass, children] }));
});
PopoverSurface.displayName = 'PopoverSurface';
//# sourceMappingURL=popover-surface.js.map