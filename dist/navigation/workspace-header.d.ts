import type { ReactNode, RefObject } from 'react';
/**
 * Floating workspace header: a glass group with the sidebar toggle and logo, the page title and
 * detail, then optional `tools` and `actions` groups at the end. Pages supply context and
 * commands, never a second navbar skin.
 */
export declare function LabWorkspaceHeader({ toggle, title, detail, actions, tools, toolsLabel, headerRef, embedded, brandHref, brandLabel, brandSuffix, }: {
    /** The sidebar toggle, shown before the logo (e.g. LabScaffoldToggleButton). */
    toggle: ReactNode;
    /** Current page title. */
    title: string;
    /** Secondary line after the title. */
    detail?: string;
    /** Primary page commands, in their own glass group at the end. */
    actions?: ReactNode;
    /** View controls (zoom, layout, settings), in a group before `actions`. */
    tools?: ReactNode;
    /** Accessible name of the tools group. */
    toolsLabel?: string;
    /** Ref to the `<header>` element, e.g. to reserve its height. */
    headerRef?: RefObject<HTMLElement | null>;
    /** Sets `data-embedded` on the header, for headers placed inside a panel instead of the page. */
    embedded?: boolean;
    /** Where the logo links; each product passes its own home. */
    brandHref?: string;
    /** Accessible name of the logo link. */
    brandLabel?: string;
    /** Short product name after the logo, e.g. `lab`. */
    brandSuffix?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=workspace-header.d.ts.map