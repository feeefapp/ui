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
 * Saturation applied to the backdrop under the regular veil, so that the share of its colour that
 * reaches the eye, `(1 - veil) · gain · saturate`, is iOS 27's: 0.52 in light, 0.99 in dark
 * (Apple's Figma kit, research/liquid-glass/FIGMA-27.md). iOS 27 shows no size dependence (bars,
 * bubbles and 300 pt panels agree within 4 levels), so both sizes carry the same values.
 */
export const GLASS_SATURATE = {
    light: { small: 1.177, large: 1.177 },
    dark: { small: 1.207, large: 1.207 },
};
/**
 * Share of the theme surface laid over the backdrop by regular glass (`--lab-glass-fill*`): iOS 27
 * regular glass is `0.443 · x + 0.514` in light and `0.82 · x + 0.094` in dark over grey backdrops;
 * with the surface colour as the veil, that is a 52 % veil plus a slight dimming (light) and, in
 * dark (whose Figma veil is a light grey, not the dark surface), a 5 % veil over a lifted, dimmed
 * backdrop that never clips (`GLASS_REGULAR_LIFT`).
 */
export const GLASS_VEIL = {
    light: { small: 0.52, large: 0.52 },
    dark: { small: 0.05, large: 0.05 },
};
/** Regular glass's own `gain · backdrop + offset` under its veil (iOS 27, see GLASS_VEIL). */
export const GLASS_REGULAR_LIFT = {
    light: { gain: 0.92, offset: 0 },
    dark: { gain: 0.863, offset: 0.095 },
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
/**
 * Shadow under every glass, clear included (iOS 27's Figma kit: y 8, blur 15 = std dev 7.5):
 * black at `--lab-glass-shadow-alpha` (2 % light, 4 % dark), `dy` px down, blurred by `blur`.
 */
export const GLASS_SHADOW = { dy: 8, blur: 7.5, alpha: { light: 0.02, dark: 0.04 } };
/**
 * The dark hairline iOS 27 draws outside every glass shape, in light and dark (FIGMA-27.md): a
 * ring `ring.width` px wide all round, plus two slivers where the shape, moved `sliver.shift` px
 * left and right and shrunk by `sliver.inset` px, reaches past its own outline (strongest at the
 * left and right, up to 0.5 px). Both darken the backdrop by their strength (plus-darker in iOS;
 * the web paints black at that alpha, Flutter subtracts it). Strengths by colour scheme for clear (tint 0) and regular (tint 1) glass,
 * mixed by the tint. It is the contrast cue that keeps glass readable on white, so it stays with
 * reduced transparency and more contrast.
 */
export const GLASS_HAIRLINE = {
    ring: { width: 0.5 },
    sliver: { shift: 1.25, inset: 0.75 },
    strength: {
        light: { clear: { ring: 0.2, sliver: 0.184 }, regular: { ring: 0.09, sliver: 0.184 } },
        dark: { clear: { ring: 0.349, sliver: 0.349 }, regular: { ring: 0.349, sliver: 0.349 } },
    },
};
/** The hairline's ring and sliver strengths (0–1 subtracted) at one tint and colour scheme. */
export function glassHairline(tint, scheme) {
    const t = clampGlassTint(tint);
    const { clear, regular } = GLASS_HAIRLINE.strength[scheme];
    return { ring: clear.ring + (regular.ring - clear.ring) * t, sliver: clear.sliver + (regular.sliver - clear.sliver) * t };
}
/**
 * Measured clear glass (FINDINGS §3, and iOS 27's Figma kit): no veil, full colour, and a slight
 * brightness lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
 */
export const GLASS_CLEAR = { gain: 1.03, offset: 0.076 };
/**
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) an app gets by default: the midpoint, a
 * light veil (26 % light, 2.5 % dark), like iOS 27's default slider position. Flutter's `glassTintDefault` matches.
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
 * The tint curve. Clear (0) and regular (1) are the measured materials (iOS 27); between them every
 * parameter follows the tint in a straight line, except saturation: what stays linear is
 * `(1 - veil) · saturate`, which is 1 for clear glass and 0.565 (light) / 1.147 (dark) for regular
 * glass, so saturation is derived from it and the veil. At the default 0.5 the veil is 26 % (light)
 * / 2.5 % (dark) and the lift is halfway between clear and regular. `glass/material.dart` and the
 * `--lab-glass-*` formulas in system.css and glass.css follow the same curve.
 */
export function glassMaterial(tint, scheme, size) {
    const t = clampGlassTint(tint);
    const regularVeil = GLASS_VEIL[scheme][size];
    const regularColour = (1 - regularVeil) * GLASS_SATURATE[scheme][size];
    const veil = t * regularVeil;
    const colour = 1 - t * (1 - regularColour);
    const lift = GLASS_REGULAR_LIFT[scheme];
    return {
        veil,
        saturate: colour / (1 - veil),
        gain: GLASS_CLEAR.gain + (lift.gain - GLASS_CLEAR.gain) * t,
        offset: GLASS_CLEAR.offset + (lift.offset - GLASS_CLEAR.offset) * t,
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
/**
 * The material of a control lens (pill: segmented control, tab bar; thumb: slider, switch), from
 * held iOS 26.2 controls over flat white, grey and black backdrops (LENS-MEASURED.md §3). Not the
 * container material: lenses never blur or lift the backdrop. Over it, in this order:
 * - `veil`: white laid at this alpha (the thumb's faint frost; the pill has none).
 * - `shade`: black at `top` alpha along the top edge fading to `middle` by half the height and
 *   staying there (the lens is a little darker on top, 0.89 → 0.965 on white).
 * - `rim`: white along the inner edge, by side (`top`, `side`, `bottom`), per colour scheme: `band`
 *   over 1 px and `edge` over its outermost third (iOS's is brightest at the outline and fades in
 *   about 1 px). The pill's is even all round, the thumb's lit at its sides.
 * - `line`: black along the thumb's top edge, `inner` over its inner 1 px and `outer` over 0.5 px
 *   outside it: a dark line that shows on light backdrops.
 * - `shadow`: black at `alpha` under it, `dy` px down, blurred by `blur` (CSS blur radius, px).
 * There is no hairline: iOS draws none around control lenses.
 */
export const LENS_MATERIAL = {
    pill: {
        veil: 0,
        shade: { top: 0.105, middle: 0.035 },
        rim: {
            light: { band: { top: 0.27, side: 0.27, bottom: 0.27 }, edge: { top: 0.45, side: 0.45, bottom: 0.45 } },
            dark: { band: { top: 0.2, side: 0.2, bottom: 0.2 }, edge: { top: 1, side: 1, bottom: 1 } },
        },
        line: { light: { inner: 0, outer: 0 }, dark: { inner: 0, outer: 0 } },
    },
    thumb: {
        veil: 0.09,
        shade: { top: 0.14, middle: 0.04 },
        rim: {
            light: { band: { top: 0, side: 0.25, bottom: 0.08 }, edge: { top: 0, side: 0.3, bottom: 0.1 } },
            dark: { band: { top: 0, side: 0.15, bottom: 0.15 }, edge: { top: 0, side: 0.18, bottom: 0.18 } },
        },
        line: { light: { inner: 0.35, outer: 0.23 }, dark: { inner: 0.24, outer: 0.31 } },
    },
};
/** The shadow every control lens casts (LENS-MEASURED.md §3): 0.89 on white just under its bottom
 * edge, gone ~12 px below, barely any above. */
export const LENS_SHADOW = { dy: 6, blur: 11, alpha: 0.13 };
/** A `kind` lens's material at `lens` (0 rest … 1 glass): every alpha eased in with it. */
export function lensMaterial(kind, lens, scheme) {
    const t = Number.isFinite(lens) ? Math.max(0, Math.min(1, lens)) : 0;
    const m = LENS_MATERIAL[kind];
    const rim = m.rim[scheme];
    return {
        veil: m.veil * t,
        shade: { top: m.shade.top * t, middle: m.shade.middle * t },
        rim: { top: rim.band.top * t, side: rim.band.side * t, bottom: rim.band.bottom * t },
        rimEdge: { top: rim.edge.top * t, side: rim.edge.side * t, bottom: rim.edge.bottom * t },
        line: { inner: m.line[scheme].inner * t, outer: m.line[scheme].outer * t },
        shadow: LENS_SHADOW.alpha * t,
    };
}
export const GLASS_MENU = {
    veil: 0.88,
    blur: 20,
    shadow: { dy: 14, blur: 20, inset: 12, alpha: 0.24 },
};
/** The menu material for one colour scheme (see `GLASS_MENU`). */
export function glassMenuMaterial(scheme) {
    const regular = glassMaterial(1, scheme, 'large');
    return { ...regular, veil: Math.max(regular.veil, GLASS_MENU.veil) };
}
/** Backdrop blur (std dev, px) of `kind` glass whose shorter side is `side` px (see `glassBlurAt`). */
export function glassKindBlur(kind, side, tint, blurOn) {
    return kind === 'menu' ? Math.max(glassBlur(side), GLASS_MENU.blur) : glassBlurAt(side, tint, blurOn);
}
//# sourceMappingURL=material.js.map