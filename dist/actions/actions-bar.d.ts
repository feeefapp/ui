import * as React from 'react';
import type { LabAction } from './types.js';
import './actions.css';
export interface LabActionsBarProps {
    actions: readonly LabAction[];
    label: string;
    align?: 'start' | 'end';
    size?: 'regular' | 'compact';
    gap?: number;
    overflowLabel?: string;
    className?: string;
    /** Defaults to the nearest dialog, otherwise document.body. */
    portalContainer?: HTMLElement | null;
    /** Application effects are injected; this primitive never calls business APIs. */
    onActionError?: (error: unknown, action: LabAction) => void;
}
/** Responsive, priority-based actions. Place inside a dock or any bounded slot. */
export declare function LabActionsBar({ actions, label, align, size, gap, overflowLabel, className, portalContainer, onActionError, }: LabActionsBarProps): React.JSX.Element;
//# sourceMappingURL=actions-bar.d.ts.map