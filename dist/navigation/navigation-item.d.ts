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
 * One row of sidebar navigation: a ghost toolbar `Button` as tall as every regular button, with
 * the icon in a square `SquareSlot` at the start, the label, and an optional trailing slot. A link
 * with `href`, a button without. In `compact` (rail) mode the item is just the icon's square and the
 * label moves into a tooltip. Needs a Radix Tooltip.Provider above it in compact mode.
 */
export declare function NavigationItem({ label, icon, trailing, href, onSelect, active, compact, }: {
    /** Visible label; also the accessible name and the rail tooltip. */
    label: string;
    /** 20px icon, centred in a square as tall as the item. */
    icon: ReactNode;
    /** A badge, count or chevron at the end, centred in a square like the icon. Hidden in the rail, where it stays in the accessible name. */
    trailing?: ReactNode;
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