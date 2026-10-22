import type { GlassRect } from './geometry.js';
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
//# sourceMappingURL=light.d.ts.map