import { type RefObject } from 'react';
import './scroll.css';
export type LabScrollGradientOverlayProps = {
    viewport: RefObject<HTMLElement | null>;
    topHeight?: number;
    bottomHeight?: number;
    density?: number;
    fadeZone?: number;
    /** Defaults to the nearest content surface, not to the floating control material. */
    color?: string;
};
/** Read scroll metrics once per frame; update opacity without rerendering the scroll content. */
export declare function LabScrollGradientOverlay({ viewport, topHeight, bottomHeight, density, fadeZone, color, }: LabScrollGradientOverlayProps): import("react").JSX.Element;
//# sourceMappingURL=gradient-overlay.d.ts.map