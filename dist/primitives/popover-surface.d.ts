import * as React from 'react';
import './popover-surface.css';
export type PopoverSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
};
/**
 * The shared material for popovers (pickers, editors, settings panels, the model ladder): one glass
 * shape in the thick menu material (GlassContainer `material="menu"`: hairline, rim light and lens,
 * veiled enough to carry text over anything), drawn behind the content. Paint only; the owner
 * (usually Radix) keeps positioning and interaction. Menus (a trigger that opens a list of choices)
 * use `MenuSurface`.
 */
export declare const PopoverSurface: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
} & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=popover-surface.d.ts.map