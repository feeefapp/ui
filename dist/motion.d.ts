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
export declare function LabStableText({ value, options, className, }: {
    value: string;
    options: string[];
    className?: string;
}): React.JSX.Element;
/**
 * Animates its own height to follow its content, so content that appears,
 * disappears or grows (results, errors, previews) eases instead of jumping.
 */
export declare function LabAutoHeight({ children, className, as: Component, ...props }: React.HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section';
}): React.JSX.Element;
/** Mounts `render` while open and through its exit, with the last open output frozen. */
export declare function LabPresence({ open, exitMs, render, }: {
    open: boolean;
    exitMs?: number;
    render: (state: PresenceState) => React.ReactNode;
}): React.JSX.Element | null;
/**
 * Cross-fades between keyed icons in one fixed-size cell, so play/pause,
 * mic/stop and similar swaps animate without moving surrounding layout.
 */
export declare function LabSwap({ swapKey, children, className, }: {
    swapKey: string;
    children: React.ReactNode;
    className?: string;
}): React.JSX.Element;
//# sourceMappingURL=motion.d.ts.map