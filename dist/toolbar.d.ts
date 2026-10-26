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
export type ToolbarOrientation = 'horizontal' | 'vertical';
/**
 * The orientation ToolbarGroups take when they don't set one. A collapsed sidebar (the scaffold's
 * rail) provides `vertical`, so its bottom groups stack their controls in a column that fits.
 */
export declare const ToolbarOrientationContext: import("react").Context<ToolbarOrientation>;
/**
 * One glass pill for related toolbar controls (`role="group"`). Children use
 * `appearance="toolbar"` and the default `regular` size, which the group sets to fill its
 * `--lab-toolbar-item` bubble (44px comfortable, controls 38px; the bubble is at least 44px on touch).
 */
export declare const ToolbarGroup: import("react").ForwardRefExoticComponent<Omit<Omit<HTMLAttributes<HTMLElement> & {
    as?: "aside" | "div" | "footer" | "header" | "nav" | "section";
    glassId?: string;
    glassUnion?: string;
    glassMotion?: import("./glass/index.js").GlassMotion;
} & import("react").RefAttributes<HTMLElement>, "ref">, "as"> & {
    /** Accessible name of the group. */
    label: string;
    /** Lay the controls out in a row or a column. Default: the surrounding ToolbarOrientationContext. */
    orientation?: ToolbarOrientation;
} & import("react").RefAttributes<HTMLElement>>;
//# sourceMappingURL=toolbar.d.ts.map