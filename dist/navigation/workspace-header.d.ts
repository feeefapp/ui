import type { ReactNode, RefObject } from 'react';
/** Shared chrome; pages supply context and commands, never a second navbar skin. */
export declare function LabWorkspaceHeader({ toggle, title, detail, actions, tools, toolsLabel, headerRef, embedded, brandHref, brandLabel, brandSuffix, }: {
    toggle: ReactNode;
    title: string;
    detail?: string;
    actions?: ReactNode;
    tools?: ReactNode;
    toolsLabel?: string;
    headerRef?: RefObject<HTMLElement | null>;
    embedded?: boolean;
    /** Where the logo links; each product passes its own home. */
    brandHref?: string;
    brandLabel?: string;
    /** Short product name after the logo, e.g. `lab`. */
    brandSuffix?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=workspace-header.d.ts.map