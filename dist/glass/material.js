/**
 * The glass material: how much it blurs, saturates and veils what is behind it, how its rim
 * catches the light and how far its shadow falls. Our own model, fitted to measurements of
 * rendered Liquid Glass (ui/research/liquid-glass/FINDINGS.md, data/model.json); colours live in
 * the theme tokens (`--lab-glass-*`), sizes and laws here. Pure, so the Flutter twin
 * (`glass/material.dart`) shares the numbers.
 *
 * Glass comes in two sizes: control-sized glass (shorter side up to `GLASS_SMALL_SIDE`) is denser
 * and lets more colour through; larger panels are more transparent.
 */
/** Glass whose shorter side is at most this (px) uses the small, denser material. */
export const GLASS_SMALL_SIDE = 72;
export function glassSize(side) {
    return side <= GLASS_SMALL_SIDE ? 'small' : 'large';
}
/** Backdrop blur (standard deviation, px): this much up to 64 px, growing to `max` on panels. */
export const GLASS_BLUR = { min: 2.9, max: 5.2, from: 64, slope: 0.025 };
/** Blur (px, a CSS `blur()` length = standard deviation) for glass whose shorter side is `side` px. */
export function glassBlur(side) {
    const { min, max, from, slope } = GLASS_BLUR;
    return Math.min(max, Math.max(min, min + (side - from) * slope));
}
/**
 * Clear glass softens what it covers even when the theme's backdrop blur is off (σ 1.6 px,
 * LIGHT-EDGES.md): that is part of why it reads as a surface over detailed content.
 */
export const GLASS_CLEAR_BLUR = 1.6;
/**
 * The blur (std dev, px) of glass at `tint` whose shorter side is `side` px: clear glass's 1.6 px
 * mixed with the regular blur (`glassBlur`, or none when ThemeConfig `glassBlur` is off).
 */
export function glassBlurAt(side, tint, blurOn) {
    const t = clampGlassTint(tint);
    return GLASS_CLEAR_BLUR * (1 - t) + t * (blurOn ? glassBlur(side) : 0);
}
/**
 * Saturation applied to the blurred backdrop before the veil: the veil keeps 13–29% of the
 * backdrop's brightness but ~70% of its colour, so saturation makes up the difference.
 */
export const GLASS_SATURATE = {
    light: { small: 5.5, large: 2.2 },
    dark: { small: 2.9, large: 2.4 },
};
/** Share of the theme surface laid over the backdrop (`--lab-glass-fill*` mix in the tokens). */
export const GLASS_VEIL = {
    light: { small: 0.87, large: 0.71 },
    dark: { small: 0.75, large: 0.72 },
};
export const GLASS_RIM = {
    light: { clear: { w0: 0.03, w1: 0.63, p: 1.1, width: 1.1 }, regular: { w0: 0.05, w1: 0.81, p: 0.9, width: 1 } },
    dark: { clear: { w0: 0, w1: 0.08, p: 1.1, width: 1.17 }, regular: { w0: 0, w1: 0.16, p: 1, width: 1.2 } },
};
/** The widest rim (px) at any tint: how deep the rim's samples must reach. */
export const GLASS_RIM_MAX_WIDTH = 1.2;
/** The rim at one tint and colour scheme. */
export function glassRim(tint, scheme) {
    const t = clampGlassTint(tint);
    const { clear, regular } = GLASS_RIM[scheme];
    const mix = (a, b) => a + (b - a) * t;
    return { w0: mix(clear.w0, regular.w0), w1: mix(clear.w1, regular.w1), p: mix(clear.p, regular.p), width: mix(clear.width, regular.width) };
}
/**
 * Rim alpha at `depth` px inside the outline, where `cosine` is the cosine of the angle between the
 * edge normal and the light axis (its sign does not matter: both ends are lit). 0 outside.
 */
export function rimLayer(depth, cosine, rim) {
    if (!(depth >= 0) || depth >= rim.width)
        return 0;
    const angular = rim.w0 + rim.w1 * Math.min(1, Math.abs(cosine)) ** rim.p;
    return Math.max(0, Math.min(1, angular * (1 - (depth / rim.width) ** 3)));
}
/**
 * The edge of the material (LIGHT-EDGES.md §4), applied to the bent backdrop before the veil:
 * `out = x + (thin + add.gain) · x · E + (add.base - thin · surface) · E`, with the edge mask
 * `E = mask(depth, cos a)`. `thin` gives part of the veil back to the backdrop over the outer
 * pixel (regular glass lets more of what is behind it through at its edge); `add` is clear glass's
 * dark-appearance rim, a light that scales with the backdrop.
 * - `mask`: `max(0, 1 - (d / width)³) · (floor + (1 - floor) · |cos a|)`.
 * - `thin` (share of the veil given back at the edge, × tint): light 0.35, dark 0.3.
 * - `add` (dark appearance, × (1 - tint)): `0.106 + 0.31 · x`.
 */
export const GLASS_EDGE = {
    mask: { width: 1, floor: 0.2 },
    thin: { light: 0.35, dark: 0.3 },
    add: { base: 0.106, gain: 0.31 },
};
/** The edge mask at `depth` px inside the outline (0 outside), for `cosine` against the light axis. */
export function edgeMask(depth, cosine) {
    const { width, floor } = GLASS_EDGE.mask;
    if (!(depth >= 0) || depth >= width)
        return 0;
    return (1 - (depth / width) ** 3) * (floor + (1 - floor) * Math.min(1, Math.abs(cosine)));
}
/**
 * The edge terms for one material, as the coefficients of `x + k1 · x · E + k3 · E`, where
 * `surface` is the grey level of the veil's colour (0–1). The veil `material.veil` is laid over
 * the result afterwards, so thinning it by K needs `veil · K / (1 - veil)` here.
 */
export function glassEdgeTerms(tint, scheme, material, surface) {
    const t = clampGlassTint(tint);
    const k = GLASS_EDGE.thin[scheme] * t;
    const thin = material.veil < 1 ? (material.veil * k) / (1 - material.veil) : 0;
    const add = scheme === 'dark' ? 1 - t : 0;
    return { k1: thin + GLASS_EDGE.add.gain * add, k3: GLASS_EDGE.add.base * add - thin * surface };
}
/** Shadow under the glass: black at the token's alpha, `dy` px down, blurred by `blur` (std dev). */
export const GLASS_SHADOW = { dy: 7.5, blur: 19.5 };
/**
 * Measured clear glass (FINDINGS §3): no veil, no shadow, full colour, and a slight brightness
 * lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
 */
export const GLASS_CLEAR = { gain: 1.03, offset: 0.076 };
/**
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) an app gets by default: the midpoint, a
 * light veil (~40 %), like iOS 27's default slider position. Flutter's `glassTintDefault` matches.
 */
export const GLASS_TINT_DEFAULT = 0.5;
/**
 * The least tint of glass bars floating over scrolling content (a ScrollArea's app bar and dock,
 * a TabView's tab bar): their labels sit on moving content, so the glass stays this veiled even
 * when the theme's tint is clearer (GlassBar). Flutter's `glassBarTint` matches.
 */
export const GLASS_BAR_TINT = 0.85;
/** A tint clamped to 0–1; anything that is not a finite number is the default. */
export function clampGlassTint(tint) {
    return typeof tint === 'number' && Number.isFinite(tint) ? Math.min(1, Math.max(0, tint)) : GLASS_TINT_DEFAULT;
}
/**
 * The tint curve. Clear (0) and regular (1) are the measured materials; between them every
 * parameter follows the tint in a straight line, except saturation: what stays linear is the
 * share of the backdrop's colour that reaches the eye, `(1 - veil) · saturate`, which is 1 for
 * clear glass and 0.64–0.73 for regular glass (FINDINGS §3), so saturation is derived from it
 * and the veil. At the default 0.5 the veil is 36–44 % (light small 43.5 %, light large 35.5 %,
 * dark small 37.5 %, dark large 36 %), saturation 1.27–1.52, half the regular shadow, half the
 * clear lift. `glass/material.dart` and the `--lab-glass-*` formulas in system.css and glass.css
 * follow the same curve.
 */
export function glassMaterial(tint, scheme, size) {
    const t = clampGlassTint(tint);
    const regularVeil = GLASS_VEIL[scheme][size];
    const regularColour = (1 - regularVeil) * GLASS_SATURATE[scheme][size];
    const veil = t * regularVeil;
    const colour = 1 - t * (1 - regularColour);
    return {
        veil,
        saturate: colour / (1 - veil),
        gain: 1 + (GLASS_CLEAR.gain - 1) * (1 - t),
        offset: GLASS_CLEAR.offset * (1 - t),
        shadow: t,
    };
}
/**
 * The lift `gain · x + offset` as CSS filter functions, `contrast(c) brightness(b)` (applied in
 * that order: contrast maps x to `c · x + (1 - c) / 2`, brightness multiplies by b).
 */
export function liftFilter(gain, offset) {
    const brightness = gain + 2 * offset;
    return { contrast: gain / brightness, brightness };
}
//# sourceMappingURL=material.js.map