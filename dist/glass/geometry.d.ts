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
    /** Optional corner exponent; 2 draws true circular corners, omitted keeps the kit superellipse. */
    cornerExponent?: number;
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
/** Share of `spacing` two touching shapes blend with (measured on rendered Liquid Glass). */
export declare const GLASS_MERGE_BASE = 0.65;
/** How much the blend widens per unit of gap / spacing, up to the full `spacing`. */
export declare const GLASS_MERGE_GAP = 0.65;
/**
 * Blend width for two shapes `gap` px apart in a container with `spacing`: the full spacing while
 * they approach (so they start to bend at `spacing` and join at half of it, like Apple's
 * GlassEffectContainer), then narrower as they close in, so the neck between touching shapes
 * stays slim instead of swelling into one blob.
 */
export declare function mergeWidth(gap: number, spacing: number): number;
/** Distance to the union of `shapes`, blended by `spacing` (see `mergeWidth`). */
export declare function unionDistance(px: number, py: number, shapes: readonly GlassShape[], spacing: number): number;
/** Gap between two boxes (0 when they touch or overlap). */
export declare function rectGap(a: GlassRect, b: GlassRect): number;
/** Groups shapes that are close enough to blend (gap below `spacing`), in input order. */
export declare function glassClusters<T extends GlassShape>(shapes: readonly T[], spacing: number): T[][];
/** Bounding box of several rects. */
export declare function boundsOf(rects: readonly GlassRect[]): GlassRect;
/** Moves every point of an SVG path made of `M`/`L` commands by `dx`, `dy`. */
export declare function translatePath(d: string, dx: number, dy: number): string;
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
/**
 * Where a container sits on screen and how much its ancestors scale it (a zoomed demo frame, a
 * sheet scaling back, `zoom`-like transforms). Glass is drawn in the container's own pixels, so
 * every screen measurement goes through this.
 */
export type HostFrame = {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
};
/** The frame of a container from its screen box and its own layout size (`offsetWidth/Height`). */
export declare function hostFrame(box: {
    left: number;
    top: number;
    width: number;
    height: number;
}, layoutWidth: number, layoutHeight: number): HostFrame;
/** A screen point in the container's own pixels. */
export declare function toLocalPoint(frame: HostFrame, x: number, y: number): {
    x: number;
    y: number;
};
/** A container-local point on screen. */
export declare function toScreenPoint(frame: HostFrame, x: number, y: number): {
    x: number;
    y: number;
};
/** A screen box (getBoundingClientRect) in the container's own pixels. */
export declare function toLocalRect(frame: HostFrame, box: {
    left: number;
    top: number;
    width: number;
    height: number;
}): GlassRect;
//# sourceMappingURL=geometry.d.ts.map