import type { HTMLAttributes, ReactNode } from 'react';
import './toolbar.css';
/** Unpainted layout; only related controls share a material. Normal Tab order is preserved. */
export declare function LabToolbar({ label, leading, trailing, className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    leading: ReactNode;
    trailing?: ReactNode;
}): import("react").JSX.Element;
export declare function LabToolbarGroup({ label, className, ...props }: HTMLAttributes<HTMLElement> & {
    label: string;
}): import("react").JSX.Element;
//# sourceMappingURL=toolbar.d.ts.map