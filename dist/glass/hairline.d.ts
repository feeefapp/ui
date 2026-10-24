import { type GlassShape } from './geometry.js';
/**
 * The hairline's two bands outside a cluster's blended outline (material.ts `GLASS_HAIRLINE`), as
 * closed loops in the shapes' coordinates: `ring` is `ring.width` px wide all round; `sliver` is
 * where the outline moved `sliver.shift` px left or right and pulled in by `sliver.inset` px still
 * reaches past it (0 to 0.5 px, at the left and right). Each band is its outer loop plus the
 * outline itself, as separate loops filled even-odd: the band is exactly what lies between them,
 * whatever their winding, and it follows merged clusters because it walks the union's own contour.
 * Pure, so the Flutter twin (`glass/hairline.dart`) draws the same bands.
 */
export interface HairlineBands {
    ring: [number, number][][];
    sliver: [number, number][][];
}
export declare function hairlineBands(shapes: readonly GlassShape[], spacing: number): HairlineBands;
/** Loops as one SVG path, moved by (`dx`, `dy`); fill it even-odd. Empty when there are none. */
export declare function bandPath(loops: readonly (readonly [number, number][])[], dx?: number, dy?: number): string;
//# sourceMappingURL=hairline.d.ts.map