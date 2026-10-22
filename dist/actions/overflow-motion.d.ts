import { type RefObject } from 'react';
/** What changed in the visible row between two layouts. Pure. */
export declare function diffVisibleActions(previous: readonly string[], next: readonly string[]): {
    /** Came out of the More menu (or are new): they grow out of the More button. */
    entering: string[];
    /** Went into the More menu (or were removed): they shrink into the More button. */
    leaving: string[];
    /** Stayed visible: they slide to their new place. */
    staying: string[];
};
/**
 * Moves actions in and out of the overflow menu instead of letting them pop: entries that spill
 * shrink into the More button, entries that come back grow out of it, and the rest slide. The
 * departing node is the real (unmounted) element, shown inert for the length of the animation.
 */
export declare function useOverflowMotion(row: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>, visible: readonly string[]): void;
//# sourceMappingURL=overflow-motion.d.ts.map