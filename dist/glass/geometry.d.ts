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
/**
 * Prepare one immutable geometry frame for repeated pixel/normal sampling. Uses the same
 * distance and blend arithmetic as unionDistance, with member centres, clamped radii and
 * blend widths resolved once instead of on every sample. Rebuild after changing a shape.
 */
export declare function prepareUnionDistance(shapes: readonly GlassShape[], spacing: number): (px: number, py: number) => number;
/** Gap between two boxes (0 when they touch or overlap). */
export declare function rectGap(a: GlassRect, b: GlassRect): number;
/** Groups shapes that are close enough to blend (gap below `spacing`), in input order. */
export declare function glassClusters<T extends GlassShape>(shapes: readonly T[], spacing: number): T[][];
/** Bounding box of several rects. */
export declare function boundsOf(rects: readonly GlassRect[]): GlassRect;
/**
 * Conservative bounds of the blended surface, including the growth outside member boxes.
 * A smooth minimum can move the zero contour outwards by k / 4 even when both members fit
 * inside the same rectangle. Repeating the same monotone blend on the distance lower bound
 * bounds that growth for any number of members without summing an unnecessarily large pad.
 */
export declare function unionBounds(shapes: readonly GlassShape[], spacing: number): GlassRect;
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
/** Which axes an element clips its descendants on, from its computed style, and the box it clips to. */
export declare function clipAxes(style: {
    display?: string;
    overflowX: string;
    overflowY: string;
    clipPath?: string;
    contain?: string;
}): {
    x: boolean;
    y: boolean;
    box: 'padding' | 'border';
};
/** A clipping box with the axes it doesn't clip opened up. */
export declare function openClip(box: GlassRect, axes: {
    x: boolean;
    y: boolean;
}): GlassRect;
/**
 * The part of the container a bubble's glass may paint in: the intersection of its clipping
 * ancestors' boxes (overflow, clip-path, contain: paint), in the container's pixels. Undefined
 * when nothing clips it; an empty rect when it is scrolled or clipped out of view.
 */
export declare function memberClip(clips: readonly GlassRect[]): GlassRect | undefined;
/** True when two rects share some area (touching edges don't). */
export declare function rectsOverlap(a: GlassRect, b: GlassRect): boolean;
/** True when `outer` contains `inner`. */
export declare function rectCovers(outer: GlassRect, inner: GlassRect): boolean;
/**
 * A path of `M`/`L`/`Z` polygons cut to `clip` (Sutherland–Hodgman per loop): the scissored
 * outline, straight at the clip edge. Winding is kept, so holes still fill correctly.
 */
export declare function scissorPath(d: string, clip: GlassRect): string;
/** CSS `clip-path: inset(…)` cutting an element laid out at `box` to `clip`; '' when it doesn't cut. */
export declare function clipInset(box: GlassRect, clip?: GlassRect): string;
/**
 * `glassPaths` for bubbles that may sit in clipped views: `clips[i]` is shape i's visible rect
 * (`memberClip`; undefined = unclipped). Only bubbles sharing a clip blend (glass inside a scroll
 * view never merges with glass outside it); every cluster keeps its whole outline `d` (rim,
 * refraction) plus `visible`, the outline cut straight at its clip (backdrop, glow, shadow cut-out),
 * and a cluster wholly outside its clip draws nothing. A clipped-out bubble stays in its cluster
 * while it is within `spacing` of the visible part, so the neck toward it is cut, not dropped.
 */
export declare function clippedGlassPaths(shapes: readonly GlassShape[], clips: readonly (GlassRect | undefined)[], spacing: number, cell?: number): (ReturnType<typeof glassPaths>[number] & {
    clip?: GlassRect;
    visible: string;
})[];
export type GlassClusterPath = ReturnType<typeof clippedGlassPaths>[number];
//# sourceMappingURL=geometry.d.ts.map