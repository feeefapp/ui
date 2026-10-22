import { type HTMLAttributes, type ReactNode } from 'react';
import './toolbar.css';
/**
 * Unpainted toolbar row: `leading` at the start, `trailing` at the end, empty space between them
 * passes pointer input through to the content below. Only related controls share a material (put
 * them in ToolbarGroups). Normal Tab order is preserved.
 */
export declare function Toolbar({ label, leading, trailing, className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    /** Accessible name of the toolbar group. */
    label: string;
    /** Start content, usually one or more ToolbarGroups. It may shrink. */
    leading: ReactNode;
    /** End content; keeps its size. */
    trailing?: ReactNode;
}): import("react").JSX.Element;
/**
 * One glass pill for related toolbar controls (`role="group"`). Children should use
 * `appearance="toolbar"` and `controlSize="compact"`; the group sizes them to 40px (44px on touch).
 */
export declare const ToolbarGroup: import("react").ForwardRefExoticComponent<Omit<Omit<HTMLAttributes<HTMLElement> & {
    as?: "aside" | "div" | "footer" | "header" | "nav" | "section";
    glassId?: string;
    glassUnion?: string;
    glassMotion?: import("./glass/index.js").GlassMotion;
} & import("react").RefAttributes<HTMLElement>, "ref">, "as"> & {
    /** Accessible name of the group. */
    label: string;
} & import("react").RefAttributes<HTMLElement>>;
//# sourceMappingURL=toolbar.d.ts.map