import type { ReactNode } from 'react';
import './navigation-item.css';
export type LabWorkspaceAction = {
    id: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
    onSelect(): void;
};
export declare function LabNavigationItem({ label, icon, href, onSelect, active, compact, }: {
    label: string;
    icon: ReactNode;
    href?: string;
    onSelect?(): void;
    active?: boolean;
    compact: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=navigation-item.d.ts.map