import { type ReactNode, type HTMLAttributes } from 'react';
import './scroll.css';
export type ScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    /** The scrolling content. */
    children: ReactNode;
    /** Chrome floating over the top edge (toolbar, filter bar). Its height is reserved as top padding. */
    top?: ReactNode;
    /** Chrome floating over the bottom edge (usually a Dock). Its height is reserved as bottom padding. */
    bottom?: ReactNode;
    /** Accessible name of the scroll region. */
    label: string;
    /** Space in px between a float and the area's edges; also added above and below it in the reservation. Default: the shell gap G (`--lab-shell-gap`, 8). */
    edgeGap?: number;
    /** Space in px between a float and the area's sides, when it differs from `edgeGap` (a scaffold's app bar uses `--lab-toolbar-inset`). */
    sideGap?: number;
    /** Content padding in px: inline sides, and top/bottom when no float is present. Default: the shell gap G (`--lab-shell-gap`, 8); cards bring their own inner padding. */
    contentPadding?: number;
    /** Paints the dithered edge washes that fade content under the floats. */
    gradient?: boolean;
    /** Top wash height in px. Defaults to the top float's height plus two edge gaps, at least 100. */
    topFadeHeight?: number;
    /** Bottom wash height in px. Defaults to the bottom float's height plus two edge gaps, at least 140. */
    bottomFadeHeight?: number;
    /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
    viewportProps?: HTMLAttributes<HTMLDivElement>;
};
/**
 * Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes. Fills its
 * parent, which must have a bounded height. The forwarded ref points at the scrolling element.
 */
export declare const ScrollArea: import("react").ForwardRefExoticComponent<Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    /** The scrolling content. */
    children: ReactNode;
    /** Chrome floating over the top edge (toolbar, filter bar). Its height is reserved as top padding. */
    top?: ReactNode;
    /** Chrome floating over the bottom edge (usually a Dock). Its height is reserved as bottom padding. */
    bottom?: ReactNode;
    /** Accessible name of the scroll region. */
    label: string;
    /** Space in px between a float and the area's edges; also added above and below it in the reservation. Default: the shell gap G (`--lab-shell-gap`, 8). */
    edgeGap?: number;
    /** Space in px between a float and the area's sides, when it differs from `edgeGap` (a scaffold's app bar uses `--lab-toolbar-inset`). */
    sideGap?: number;
    /** Content padding in px: inline sides, and top/bottom when no float is present. Default: the shell gap G (`--lab-shell-gap`, 8); cards bring their own inner padding. */
    contentPadding?: number;
    /** Paints the dithered edge washes that fade content under the floats. */
    gradient?: boolean;
    /** Top wash height in px. Defaults to the top float's height plus two edge gaps, at least 100. */
    topFadeHeight?: number;
    /** Bottom wash height in px. Defaults to the bottom float's height plus two edge gaps, at least 140. */
    bottomFadeHeight?: number;
    /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
    viewportProps?: HTMLAttributes<HTMLDivElement>;
} & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=scroll-area.d.ts.map