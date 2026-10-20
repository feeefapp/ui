import { type ReactNode } from 'react';
/**
 * Layout boundary supplied by a shrink-wrapping parent such as LabDock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export declare function LabActionsWidthProvider({ value, children, }: {
    value: number | undefined;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useLabActionsWidth(): number | undefined;
//# sourceMappingURL=width-context.d.ts.map