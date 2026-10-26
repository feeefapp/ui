export type FoCornerRadius = {
    x: number;
    y: number;
};
export type FoCornerRadii = [FoCornerRadius, FoCornerRadius, FoCornerRadius, FoCornerRadius];
/** The exponent of a fully smoothed corner: CSS `superellipse(1.5)` is 2 ** 1.5 (a circle is 2). */
export declare const FO_CORNER_EXPONENT: number;
/**
 * Where corner smoothing starts to fade, as a share of the largest radius a box can take (half its
 * shorter side). Below it a corner keeps the full continuous curve; from it to the full radius the
 * smoothing eases to 0, so a circle-sized corner is a circular arc.
 */
export declare const CORNER_SMOOTHING_FADE = 0.75;
/**
 * Clamped continuous corners (Apple's continuous corners, Figma's clamped corner smoothing): how
 * much a corner of `radius` on a `width` × `height` box is smoothed, from 1 (the kit's
 * superellipse(1.5)) to 0 (a circular arc). Full smoothing while the radius is at most
 * CORNER_SMOOTHING_FADE (0.75) of half the shorter side, then a smoothstep down to 0 at half the
 * shorter side: a 44 × 44 bubble at r 22 is a circle, a 44-tall bar at r 22 a true capsule, and a
 * 300 × 200 card at r 16 keeps the full continuous corner. The Flutter twin is `cornerSmoothing`
 * in brand/geometry.dart (vectors in flutter/test/fixtures/corners.json).
 */
export declare function cornerSmoothing(radius: number, width: number, height: number): number;
/** The CSS `superellipse(k)` parameter for a smoothing (k = 1 + smoothing / 2: 1 is round, 1.5 the kit's). */
export declare function cornerShapeParameter(smoothing: number): number;
/** The superellipse exponent a corner draws with: 2 ** k, from 2 (circle) to 2 ** 1.5. */
export declare function cornerExponentFor(radius: number, width: number, height: number): number;
/** CSS superellipse(k) has exponent 2 ** k: sample its equation rather than stretching circular
 * border-radius arcs. Without `exponent`, every corner takes its clamped exponent
 * (`cornerSmoothing`, measured on the box after the inset and the CSS overlap scaling); a given
 * exponent applies to all four. At typical control sizes the 32 segments per corner have subpixel
 * error.
 */
export declare function foSuperellipsePath(width: number, height: number, radii: FoCornerRadii, inset?: number, exponent?: number): string;
/** Uniform continuous corner path retained for other Feeef brand helpers. */
export declare function foContinuousEdge(width: number, height: number, radius: number, inset?: number): string;
//# sourceMappingURL=geometry.d.ts.map