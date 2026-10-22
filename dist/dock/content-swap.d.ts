import { type ReactNode } from 'react';
/**
 * Cross-fades interactive dock content when `swapKey` changes: the old content fades out and turns
 * inert (focus moves to the dock first), then the new content fades in. Same-key changes keep focus
 * and child state.
 */
export declare function LabDockContentSwap({ swapKey, children, }: {
    /** Coarse task identity, e.g. `idle` / `selected`. */
    swapKey: string;
    /** The current content. */
    children: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=content-swap.d.ts.map