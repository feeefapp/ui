import { type HTMLAttributes, type ReactNode } from 'react';
import './dock.css';
export type LabDockProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'content'> & {
    label: string;
    /** A compact title/status tile. It may shrink; actions remain accessible through overflow. */
    content?: ReactNode;
    children: ReactNode;
    /** Bottom task actions stay centered by default. Override only for contextual chrome. */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Use task identity, e.g. idle/selected; don't key every count or label change. */
    swapKey?: string;
};
/** Floating glass container; positioning and scroll reservations belong to its host. */
export declare const LabDock: import("react").ForwardRefExoticComponent<Omit<HTMLAttributes<HTMLElement>, "children" | "content"> & {
    label: string;
    /** A compact title/status tile. It may shrink; actions remain accessible through overflow. */
    content?: ReactNode;
    children: ReactNode;
    /** Bottom task actions stay centered by default. Override only for contextual chrome. */
    align?: "start" | "center" | "end" | "stretch";
    /** Use task identity, e.g. idle/selected; don't key every count or label change. */
    swapKey?: string;
} & import("react").RefAttributes<HTMLElement>>;
//# sourceMappingURL=dock.d.ts.map