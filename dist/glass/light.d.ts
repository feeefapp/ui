import { type GlassRect, type GlassShape } from './geometry.js';
/**
 * Where light comes from, as a unit vector pointing from a bubble toward the light (screen
 * coordinates, y down). The default matches the kit's rim: light from the top-left (135°).
 */
export type GlassLight = {
    x: number;
    y: number;
};
export declare const DEFAULT_GLASS_LIGHT: GlassLight;
/** How far (px) a pointer still pulls the light toward itself. */
export declare const GLASS_LIGHT_REACH = 480;
/**
 * Light for a bubble at `centre` with a fine pointer at `pointer` (or none): the default light,
 * turned toward the pointer the closer it is, so the rim brightens on the edge facing it.
 */
export declare function glassLightToward(centre: {
    x: number;
    y: number;
}, pointer: {
    x: number;
    y: number;
} | null, base?: GlassLight, reach?: number): GlassLight;
/**
 * Endpoints of the rim gradient over `bounds`, CSS-style: the line runs through the centre along
 * the light and is long enough that its ends touch the farthest corners. Offset 0 is the lit end.
 */
export declare function rimGradient(bounds: GlassRect, light: GlassLight): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};
/** Rim reflection strength from the local surface normal, independent of bubble proportions. */
export declare function rimReflection(nx: number, ny: number, light: GlassLight): number;
/** A short outline segment and the outward normal of the blended surface at its midpoint. */
export declare function rimSurface(shapes: readonly GlassShape[], spacing: number): {
    d: string;
    nx: number;
    ny: number;
}[];
/** Width in CSS pixels of the rounded, reflective bevel on control-sized glass. */
export declare const GLASS_HIGHLIGHT_WIDTH = 5;
/**
 * Specular reflection on a convex quarter-circle cross-section. Depth runs inward from the
 * outline. The surface normal rotates from horizontal at the edge to vertical at the flat
 * interior; a fixed elevated light produces a finite-width highlight within that bevel.
 */
export declare function surfaceReflection(depth: number, nx: number, ny: number, light: GlassLight, width?: number): number;
/** Cached bevel samples, at 2× resolution to keep the reflection smooth at browser zoom. */
export declare function highlightSurface(shapes: readonly GlassShape[], spacing: number, bounds: GlassRect, highlightWidth?: number): {
    width: number;
    height: number;
    bezel: number;
    samples: {
        index: number;
        depth: number;
        nx: number;
        ny: number;
        coverage: number;
    }[];
};
/** Soft occlusion on the unlit inner bevel, paired with the reflected light for optical depth. */
export declare function surfaceShade(depth: number, nx: number, ny: number, light: GlassLight, width?: number): number;
/** Screenshot-fitted rim: an outer-edge peak with symmetric lighting and a smooth inward fade.
 * Width and falloff are our reconstruction; base/peak come from theme rim tokens. */
export declare function measuredRimReflection(depth: number, nx: number, ny: number, light: GlassLight, width: number, base: number, peak: number): number;
//# sourceMappingURL=light.d.ts.map