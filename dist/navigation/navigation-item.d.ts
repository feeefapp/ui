import type { ReactNode } from 'react';
import './navigation-item.css';
/** A navigation entry described as data. */
export type WorkspaceAction = {
    id: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
    onSelect(): void;
};
/**
 * One row of sidebar navigation: icon and label, a link with `href` or a button without. In
 * `compact` (rail) mode only the icon shows and the label moves into a tooltip. Needs a Radix
 * Tooltip.Provider above it.
 */
export declare function NavigationItem({ label, icon, href, onSelect, active, compact, }: {
    /** Visible label; also the accessible name and the rail tooltip. */
    label: string;
    /** 20px icon. */
    icon: ReactNode;
    /** Renders a link. Without it the item is a button. */
    href?: string;
    /** Called on click (also for links, e.g. to route client-side or close a drawer). */
    onSelect?(): void;
    /** Marks the current page (`aria-current="page"`) and paints it selected. */
    active?: boolean;
    /** Icon-only rail mode with a tooltip label. */
    compact: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=navigation-item.d.ts.map