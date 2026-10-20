/**
 * Optional SVG fallback for browsers without native corner-shape support.
 * LabProvider leaves this engine disabled unless enableCornerFallback is true.
 * Interactive hosts are never clipped; cleanup restores their original paint.
 */
export declare function installFoContinuousCorners(root?: Document | HTMLElement): () => void;
//# sourceMappingURL=corners.d.ts.map