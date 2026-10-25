import * as React from 'react';
import './motion.css';
export type PresenceState = 'open' | 'closed';
/**
 * Keeps an element mounted while it animates out. `state` drives `data-state`
 * so CSS owns the motion; the timer is the source of truth for unmounting.
 */
export declare function usePresence(open: boolean, exitMs?: number): {
    mounted: boolean;
    state: PresenceState;
};
/** Renders the last children while closing so exit frames never flash new content. */
export declare function useLatched<T>(value: T, hold: boolean): T;
/**
 * Label that swaps between known values without changing width: every option
 * is laid out in the same grid cell and only the active one is visible.
 */
export declare function StableText({ value, options, className, }: {
    /** The label to show now. */
    value: string;
    /** Every label this slot can show; the widest one sets the width. */
    options: string[];
    className?: string;
}): React.JSX.Element;
/**
 * Animates its own height to follow its content, so content that appears,
 * disappears or grows (results, errors, previews) eases instead of jumping.
 */
export declare function AutoHeight({ children, className, as: Component, ...props }: React.HTMLAttributes<HTMLElement> & {
    /** Element to render as the outer box. */
    as?: 'div' | 'section';
}): React.JSX.Element;
/** Mounts `render` while open and through its exit, with the last open output frozen. */
export declare function Presence({ open, exitMs, render, }: {
    /** Whether the content should be shown. */
    open: boolean;
    /** How long the closing frame stays mounted, in milliseconds. 0 under reduced motion. */
    exitMs?: number;
    /** Draws the content. Put the state on `data-state` so CSS can animate open and closed. While
     * closing, the frozen element also gets `data-glass-hidden`: glass bubbles in it leave the glass
     * (absorbed into their nearest neighbour) while their content fades. */
    render: (state: PresenceState) => React.ReactNode;
}): React.JSX.Element | null;
/**
 * Cross-fades between keyed icons in one fixed-size cell, so play/pause,
 * mic/stop and similar swaps animate without moving surrounding layout.
 */
export declare function Swap({ swapKey, children, className, }: {
    /** Identity of the current child; changing it cross-fades the old child out and the new one in. */
    swapKey: string;
    /** The icon to show. Decorative: the cell is `aria-hidden`, so label the control around it. */
    children: React.ReactNode;
    className?: string;
}): React.JSX.Element;
//# sourceMappingURL=motion.d.ts.map