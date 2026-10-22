import { type GlassShape } from './geometry.js';
/**
 * Refraction for the canvas renderer: glass that bends the content behind it near its edges, as a
 * displacement map (red = x, green = y, 128 = no shift) for SVG `feDisplacementMap`. Only the
 * bevel bends; the flat middle shows the backdrop straight, like Apple's glass. Pure, so the
 * Flutter twin (a fragment shader there) follows the same profile.
 */
/** Width (px) of the bending rim, capped by half the glass height. */
export declare const GLASS_BEZEL = 14;
/** Largest shift (px) at the very edge; the filter's `scale` is twice this. */
export declare const GLASS_REFRACTION = 9;
/**
 * Bend at one point from its signed distance `d` (negative inside) and the outward normal
 * (`nx`, `ny`, unit length): a shift toward the inside that is strongest at the edge and fades to
 * zero across the bezel, following a convex squircle profile's slope. Returns -1…1 per axis.
 */
export declare function refractionAt(d: number, nx: number, ny: number, bezel?: number): {
    x: number;
    y: number;
};
/**
 * RGBA displacement map for `width` × `height` px (material coordinates) holding the blended
 * outlines of `clusters`. Pixels outside the glass and in its flat middle stay neutral.
 */
export declare function displacementMap(width: number, height: number, clusters: readonly (readonly GlassShape[])[], spacing: number, bezel?: number): {
    width: number;
    height: number;
    data: Uint8ClampedArray<ArrayBuffer>;
};
/**
 * True where SVG filters work as a backdrop filter (Chromium). Elsewhere `backdrop-filter: url()`
 * is ignored or breaks the blur, so the canvas renderer keeps CSS glass.
 */
export declare function supportsRefraction(): boolean;
//# sourceMappingURL=refraction.d.ts.map