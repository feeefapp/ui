import * as React from 'react';
export type PresentationDockProps = {
    /** Accessible name of the group. Default “Actions”. */
    label?: string;
    /** A compact status before the actions (“3 selected”). */
    content?: React.ReactNode;
    /** The surface's actions: Cancel as `text`, the one main action `filled`, last. */
    children: React.ReactNode;
    className?: string;
};
/**
 * The actions of a presentation surface in one floating glass dock. Put it in a surface's `dock`
 * (or a `PresentationBody` `bottom`) so the actions never scroll away.
 */
export declare function PresentationDock({ label, content, children, className }: PresentationDockProps): React.JSX.Element;
//# sourceMappingURL=dock.d.ts.map