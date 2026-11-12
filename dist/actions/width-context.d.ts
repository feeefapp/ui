import { type ReactNode } from 'react';
/**
 * Layout boundary supplied by a shrink-wrapping parent such as Dock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export declare function ActionsWidthProvider({ value, children, }: {
    /** Available width for the actions slot, in pixels. `undefined` lets each bar measure its own host. */
    value: number | undefined;
    /** Content containing one or more `ActionsBar`s. */
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useActionsWidth(): number | undefined;
//# sourceMappingURL=width-context.d.ts.map