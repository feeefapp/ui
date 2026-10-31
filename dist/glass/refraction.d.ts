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
 * `scale / 2` px, the value to pass to `feDisplacementMap`; blue is the edge mask
 * (`material.ts` `edgeMask`, lit by the default light so the map stays independent of the
 * pointer), averaged over each map pixel; alpha is the glass shape itself
 * (anti-aliased), so the filter can clip its own output: Chromium ignores an element's clip-path
 * for `backdrop-filter: url()`. Each cluster bends by its own size (its smallest shape).
 */
/**
 * The gentle lens (the default; iOS 27's lens never folds the backdrop back): for the quartic bezel,
 * max |d(shift)/d(depth)| = 4 × shift / bezel, kept below one so the sampled background cannot
 * reverse direction along an edge. Flutter's `gentleRefractionShift` matches.
 */
export declare function gentleRefractionShift(side: number, bezel?: number): number;
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
/** A control lens's kind: a pill (segmented control, tab bar), a slider thumb or a switch thumb. */
export type LensKind = 'pill' | 'thumb' | 'switch';
/**
 * How control lenses bend what is behind them. The shift (px, positive = the pixel shows the backdrop
 * from further inside) at depth `d` px from the outline:
 * - pill (the selection of a segmented control or a tab bar, lifted out of its rest pill by
 *   `LENS_PILL_LIFT`): a dome bevel, flat face, as the open liquid-glass renderers fit iOS 27
 *   (whynotmake.it liquid_glass_renderer, liquid_glass_easy): over a bevel of `height` px (at most a
 *   quarter of the shorter side) the shift is `amount · (1 - √(1 - x²))`, `x = 1 - d / bevel`
 *   (`amount` at most half the shorter side): the rim shows a compressed, mirrored band from deep
 *   inside, the face stays put. Under it a floor keeps the lens from ever showing past its rest pill
 *   (the track's edge and what is past it): with `gap` = how far the lens reaches past its rest pill
 *   there and `G = gap + margin`, the shift is at least `G · (1 - d / (reach · G))²`.
 * - thumb (slider): inward, 7.1 px over the outer 1 px, then `7.1 · (1 - (d - 1) / 6.5)^2.2` to
 *   nothing at 7.5 px; its outer `soft` px are softened (`LENS_SOFT`). Measured on iOS 26.2 (§2).
 * - switch: iOS 26.2's measured lip (§2, the segmented pill's profile at two thirds): a 0.6 px inward
 *   rim of `rim` px, then outward (it shows the backdrop from outside its edge, so lines crowd toward
 *   the rim) rising 1 px per px to `peak` px at `at` px deep, then fading as `exp(-(d - at) / decay)`,
 *   leaning away from the centre (`radial`: the direction is the outline's normal plus `radial` × the
 *   offset from the centre over the half size), and its whole middle zoomed out (`zoom`: it shows the
 *   backdrop `zoom` × the offset from the centre further out, so it looks about 13 % smaller across).
 * All are the same in light and dark appearance.
 */
export declare const LENS_BEND: {
    readonly pill: {
        readonly height: 20;
        readonly amount: 60;
        readonly margin: 1;
        readonly reach: 2.5;
    };
    readonly thumb: {
        readonly peak: 7.1;
        readonly at: 1;
        readonly reach: 6.5;
        readonly power: 2.2;
        readonly soft: 5;
    };
    readonly switch: {
        readonly rim: 4.02;
        readonly rimWidth: 0.6;
        readonly peak: 2.881;
        readonly at: 5;
        readonly decay: 10.5;
        readonly radial: 1.5;
        readonly zoom: {
            readonly x: 0.04;
            readonly y: 0;
        };
    };
};
/**
 * The slider thumb's soft edge: iOS 26.2 blurs the band it bends (fringe contrast 0.45 of the middle
 * at its rim, back to full about 5 px in). A blur of `blur` px (standard deviation) mixed in by the
 * map's blue channel, `1 - d / soft`.
 */
export declare const LENS_SOFT: {
    readonly blur: 2;
};
/** Raster work allowed for one lens map: up to 3 samples per px on a control lens. */
export declare const LENS_MAP_PIXELS = 65536;
/**
 * The bend (px, positive inward) of a `kind` lens at depth `d` px inside its outline. A pill's
 * depends on `halfMinor` (half its shorter side, which caps its bevel and shift) and `gap`: how far
 * (px) the lens reaches past its rest pill at that point (0 when it hasn't lifted).
 */
export declare function lensBend(kind: LensKind, d: number, gap?: number, halfMinor?: number): number;
/**
 * The map of a control's lens (lens-layer.ts): one `shape` (its own box, at 0, 0) bending by
 * `lensBend` along its outline's normal (a switch also leans and zooms out). A pill passes `lift`,
 * how far it reaches past its rest pill on each side (its rest pill is the shape inset by it, the
 * corner smaller by `lift.y`): its bend follows the gap between the two outlines. Same encoding as
 * `displacementMap` (red/green = shift as a share of `scale / 2`, alpha = the shape, blue = how much
 * of the softened copy shows: the thumb's `LENS_SOFT` band), sampled at most `LENS_MAP_PIXELS`. The
 * bend is linear in `scale`, so an owner can ease a thumb's lens in by scaling `scale` alone.
 */
export declare function lensDisplacementMap(shape: GlassShape, kind: LensKind, lift?: {
    x: number;
    y: number;
}): {
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
/**
 * What glass can do in this browser, for apps that show or log it (a settings screen, telemetry):
 * `refraction` = SVG backdrop filters bend the backdrop (Chromium), `elementRefraction` = a
 * supplied `backdropSource` can be bent (Firefox), `backdropBlur` = `backdrop-filter` blurs.
 * The kit already uses these checks itself; profiles never need a per-browser variant.
 */
export declare function glassCapabilities(): {
    refraction: boolean;
    elementRefraction: boolean;
    backdropBlur: boolean;
};
/** Place a live background image in a glass piece, with both boxes in material coordinates. */
export declare function elementImagePlacement(source: GlassRect, piece: GlassRect): {
    width: number;
    height: number;
    x: number;
    y: number;
};
//# sourceMappingURL=refraction.d.ts.map