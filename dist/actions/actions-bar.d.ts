import * as React from 'react';
import type { Action } from './types.js';
import './actions.css';
export interface ActionsBarProps {
    /** The action tree, in display order. Top-level entries spill into the overflow menu by `priority`. */
    actions: readonly Action[];
    /** Accessible name of the toolbar group. */
    label: string;
    /** Which side the row hugs inside a wider host. */
    align?: 'start' | 'end';
    /** Control height: regular 44px or compact 40px. */
    size?: 'regular' | 'compact';
    /** Space between controls, in pixels. Included in the fit. */
    gap?: number;
    /** Accessible name of the overflow trigger. Defaults to the localized "More actions". */
    overflowLabel?: string;
    /** Class name for the bar. */
    className?: string;
    /** Defaults to the nearest dialog, otherwise document.body. */
    portalContainer?: HTMLElement | null;
    /** Application effects are injected; this primitive never calls business APIs. */
    onActionError?: (error: unknown, action: Action) => void;
}
/**
 * Responsive, priority-based actions. Measures its real controls and moves the lowest-priority
 * ones into a "More actions" menu when they don't fit. Place inside a dock or any bounded slot.
 */
export declare function ActionsBar({ actions, label, align, size, gap, overflowLabel, className, portalContainer, onActionError, }: ActionsBarProps): React.JSX.Element;
//# sourceMappingURL=actions-bar.d.ts.map