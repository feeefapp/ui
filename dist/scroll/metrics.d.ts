export declare const LAB_SCROLL_FADE_ZONE = 80;
export declare const LAB_SCROLL_REST_TOP = 0.28;
export declare const LAB_SCROLL_REST_BOTTOM = 0.48;
/** Mirrors Merchant ScrollGradientOverlay, including underflow and overscroll. */
export declare function scrollEdgeOpacities(offset: number, extent: number, fadeZone?: number): {
    top: number;
    bottom: number;
};
/** Float height plus the edge gap on both sides. A missing float leaves normal content padding. */
export declare function scrollContentReserve(height: number, gap: number, padding: number): number;
/** Minimum movement to reveal one interval, without moving an enclosing workspace. */
export declare function scrollRevealDelta(start: number, end: number, visibleStart: number, visibleEnd: number, alignment?: 'nearest' | 'center'): number;
/** Static seeded square dithering; no random flicker or per-scroll geometry work. */
export declare function scrollWashPaths(columns: number, rows: number): string[];
//# sourceMappingURL=metrics.d.ts.map