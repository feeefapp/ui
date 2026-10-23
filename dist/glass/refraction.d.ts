import { type GlassShape, type GlassRect } from './geometry.js';
/**
 * Refraction for the canvas renderer: glass that bends the content behind it near its edges, as a
 * displacement map (red = x, green = y, 128 = no shift) for SVG `feDisplacementMap`. Only the
 * bevel bends; the flat middle shows the backdrop straight. The profile is our own fit to
 * measurements of rendered Liquid Glass (ui/research/liquid-glass/FINDINGS.md): at depth `t` from
 * the edge a pixel shows the backdrop from `shift · (1 - t / bezel)^4` deeper inside, so the rim
 * compresses the background. The default web map caps the shift to prevent mirrored folds; the measured profile restores the native fit. Pure, so the Flutter twin (a fragment
 * shader there) follows the same profile.
 */
/** Bezel width (px) of large glass: where the bend fades to nothing. */
export declare const GLASS_BEZEL = 27;
/** Largest shift (px), at the very edge of large glass. */
export declare const GLASS_REFRACTION = 47;
/** Exponent of the bend's fall-off across the bezel. */
export declare const GLASS_BEZEL_POWER = 4;
/** Glass whose shorter side reaches this (px) bends fully; smaller glass scales bezel and shift. */
export declare const GLASS_LARGE_SIDE = 88;
/** How fast smaller glass shrinks its bezel: scale = (side / GLASS_LARGE_SIDE) ^ this. */
export declare const GLASS_SIZE_EXPONENT = 0.78;
/** Bezel and shift scale for glass whose shorter side is `side` px (1 for large glass). */
export declare function refractionScale(side: number): number;
/**
 * Bend at one point from its signed distance `d` (negative inside) and the outward normal
 * (`nx`, `ny`, unit length): a shift toward the inside that is strongest at the edge and fades to
 * zero across the bezel. Returns -1…1 per axis, as a share of the largest shift.
 */
export declare function refractionAt(d: number, nx: number, ny: number, bezel?: number): {
    x: number;
    y: number;
};
/**
 * RGBA displacement map for `width` × `height` px (material coordinates) holding the blended
 * outlines of `clusters`. Red/green carry the shift (neutral in the flat middle) as a share of
 * `scale / 2` px, the value to pass to `feDisplacementMap`; alpha is the glass shape itself
 * (anti-aliased), so the filter can clip its own output: Chromium ignores an element's clip-path
 * for `backdrop-filter: url()`. Each cluster bends by its own size (its smallest shape).
 */
/**
 * Web transport cap: for the quartic bezel, max |d(shift)/d(depth)| = 4 × shift / bezel.
 * Keep it below one so the sampled background cannot reverse direction along an edge.
 */
export declare function webRefractionShift(side: number, bezel?: number): number;
export declare function displacementMap(width: number, height: number, clusters: readonly (readonly GlassShape[])[], spacing: number, bezel?: number, profile?: 'gentle' | 'measured'): {
    width: number;
    height: number;
    data: Uint8ClampedArray<ArrayBuffer>;
    scale: number;
};
/** Maximum raster work per live map, independent of browser zoom or the host's area. */
export declare const GLASS_LIVE_MAP_PIXELS = 32768;
/**
 * A bounded map for both moving and settled glass. Sampling always uses material coordinates:
 * lowering raster density changes neither the bezel nor the returned displacement scale in CSS
 * pixels. The caller stretches this image to the logical width/height. One density policy for
 * motion and rest avoids a visible change of lens when a gesture finishes.
 */
export declare function liveDisplacementMap(width: number, height: number, clusters: readonly (readonly GlassShape[])[], spacing: number, profile?: 'gentle' | 'measured'): {
    width: number;
    height: number;
    data: Uint8ClampedArray<ArrayBuffer>;
    scale: number;
};
/**
 * Encode an RGBA map without canvas readback or synchronous PNG compression. A top-down 32-bit
 * BITMAPV4HEADER carries explicit RGB/alpha masks, preserving the map's anti-aliased coverage in
 * Chromium and Firefox. The byte order is BGRA; the input remains unchanged.
 */
export declare function rgbaBmpBytes(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): Uint8Array<ArrayBuffer>;
/** Inline transport for engines that synchronously sample the map as a backdrop filter. */
export declare function rgbaBmpDataUrl(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): string;
/**
 * True where SVG filters work as a backdrop filter (Chromium). Elsewhere `backdrop-filter: url()`
 * is ignored or breaks the blur, so the canvas renderer keeps CSS glass.
 */
export declare function supportsRefraction(): boolean;
/** Firefox can refract an explicitly supplied live element image with a regular SVG filter. */
export declare function supportsElementRefraction(): boolean;
/** Place a live background image in a glass piece, with both boxes in material coordinates. */
export declare function elementImagePlacement(source: GlassRect, piece: GlassRect): {
    width: number;
    height: number;
    x: number;
    y: number;
};
//# sourceMappingURL=refraction.d.ts.map