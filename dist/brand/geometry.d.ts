export type FoCornerRadius = {
    x: number;
    y: number;
};
export type FoCornerRadii = [FoCornerRadius, FoCornerRadius, FoCornerRadius, FoCornerRadius];
export declare const FO_CORNER_EXPONENT: number;
/** CSS superellipse(1.5) has exponent 2 ** 1.5, not the circular exponent 2.
 * Sample its equation rather than stretching circular border-radius arcs.
 * At typical control sizes the 32 segments per corner have subpixel error.
 */
export declare function foSuperellipsePath(width: number, height: number, radii: FoCornerRadii, inset?: number, exponent?: number): string;
/** Uniform continuous corner path retained for other Feeef brand helpers. */
export declare function foContinuousEdge(width: number, height: number, radius: number, inset?: number): string;
//# sourceMappingURL=geometry.d.ts.map