import * as React from 'react';
import './popover-surface.css';
export type LabPopoverSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
    seed?: string;
};
/** Shared opaque menu/popover material; owners retain positioning and interaction. */
export declare const LabPopoverSurface: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Decorate the actual Radix/content host without adding a positioning wrapper. */
    asChild?: boolean;
    seed?: string;
} & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=popover-surface.d.ts.map