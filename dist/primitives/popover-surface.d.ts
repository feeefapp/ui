import * as React from 'react';
import './popover-surface.css';
export type PopoverSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
    /** Seed for the decorative pixel grain, so neighbouring surfaces don't look identical. */
    seed?: string;
};
/**
 * The shared opaque material for popovers (pickers, editors, settings panels): surface, border,
 * group corners and a faint animated pixel grain. Paint only; the owner (usually Radix) keeps
 * positioning and interaction. Menus (a trigger that opens a list of choices) use `MenuSurface`.
 */
export declare const PopoverSurface: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
    /** Seed for the decorative pixel grain, so neighbouring surfaces don't look identical. */
    seed?: string;
} & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=popover-surface.d.ts.map