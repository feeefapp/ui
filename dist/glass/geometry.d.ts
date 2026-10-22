/**
 * Glass geometry: the outline that one glass material takes around a set of bubbles. Shapes far
 * apart keep their exact superellipse outline. Shapes closer than the container's `spacing` bend
 * toward each other and join (smooth union of signed distance fields), like Apple's
 * GlassEffectContainer. Pure functions, shared with the Flutter twin through test vectors.
 */
export type GlassRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type GlassShape = GlassRect & {
    /** Corner radius before clamping to half the shorter side. */
    radius: number;
};
/** Corner radius a shape actually draws with: never more than half its shorter side. */
export declare function clampRadius(shape: GlassShape): number;
/**
 * Signed distance from a point to a rounded box with superellipse corners (exponent 2^1.5, the
 * kit's `corner-shape: superellipse(1.5)`): negative inside, zero on the outline. The zero level
 * is exactly the curve `foSuperellipsePath` draws; away from it the value is a close
 * approximation, which is all a smooth union needs.
 */
export declare function shapeDistance(px: number, py: number, shape: GlassShape, exponent?: number): number;
/**
 * Smooth minimum (quadratic). Two distances closer than `k` blend: outlines start to bend toward
 * each other when the gap between shapes drops below `k` and join when it drops below `k / 2`.
 * `k <= 0` is the plain union.
 */
export declare function smoothMin(a: number, b: number, k: number): number;
/** Distance to the union of `shapes`, blended with `spacing`. */
export declare function unionDistance(px: number, py: number, shapes: readonly GlassShape[], spacing: number): number;
/** Gap between two boxes (0 when they touch or overlap). */
export declare function rectGap(a: GlassRect, b: GlassRect): number;
/** Groups shapes that are close enough to blend (gap below `spacing`), in input order. */
export declare function glassClusters<T extends GlassShape>(shapes: readonly T[], spacing: number): T[][];
/** Bounding box of several rects. */
export declare function boundsOf(rects: readonly GlassRect[]): GlassRect;
/** The exact outline of one shape, as the kit draws it elsewhere (SVG path, absolute coordinates). */
export declare function shapePath(shape: GlassShape): string;
export type Point = [number, number];
/**
 * Closed outlines of the blended union of `shapes` (marching squares on a `cell`-sized grid with
 * linear interpolation). Every loop keeps the inside on its left, so outer outlines and holes
 * wind opposite ways and fill correctly with the nonzero rule.
 */
export declare function unionLoops(shapes: readonly GlassShape[], spacing: number, cell?: number): Point[][];
/** Signed area of a loop (screen coordinates, y down): positive for clockwise. */
export declare function loopArea(loop: readonly Point[]): number;
/** One cluster's outline: the exact shape when alone, the blended union when several. */
export declare function clusterPath(shapes: readonly GlassShape[], spacing: number, cell?: number): string;
/** Outline of every cluster, one SVG path per cluster. */
export declare function glassPaths(shapes: readonly GlassShape[], spacing: number, cell?: number): {
    shapes: GlassShape[];
    bounds: GlassRect;
    d: string;
}[];
//# sourceMappingURL=geometry.d.ts.map