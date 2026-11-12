import { type RefObject } from 'react';
import './scroll.css';
export type ScrollGradientOverlayProps = {
    /** The scrolling element whose offset drives the washes. */
    viewport: RefObject<HTMLElement | null>;
    /** Top wash height in px, capped at 40% of the viewport. */
    topHeight?: number;
    /** Bottom wash height in px, capped at 40% of the viewport. */
    bottomHeight?: number;
    /** Overall wash strength, 0 to 1. */
    density?: number;
    /** Scroll distance in px over which a wash fades in from an edge. */
    fadeZone?: number;
    /** Defaults to the nearest content surface, not to the floating control material. */
    color?: string;
};
/**
 * Dithered top and bottom edge washes for a custom scroller. Place it as an absolutely positioned
 * sibling of the viewport inside a `position: relative` box. Reads scroll metrics once per frame
 * and updates opacity without rerendering the scroll content.
 */
export declare function ScrollGradientOverlay({ viewport, topHeight, bottomHeight, density, fadeZone, color, }: ScrollGradientOverlayProps): import("react").JSX.Element;
//# sourceMappingURL=gradient-overlay.d.ts.map