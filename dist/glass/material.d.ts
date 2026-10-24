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
export declare const GLASS_SMALL_SIDE = 72;
export type GlassSize = 'small' | 'large';
export declare function glassSize(side: number): GlassSize;
/** Backdrop blur (standard deviation, px): this much up to 64 px, growing to `max` on panels. */
export declare const GLASS_BLUR: {
    readonly min: 2.9;
    readonly max: 5.2;
    readonly from: 64;
    readonly slope: 0.025;
};
/** Blur (px, a CSS `blur()` length = standard deviation) for glass whose shorter side is `side` px. */
export declare function glassBlur(side: number): number;
/**
 * Clear glass softens what it covers even when the theme's backdrop blur is off (σ 1.6 px,
 * LIGHT-EDGES.md): that is part of why it reads as a surface over detailed content.
 */
export declare const GLASS_CLEAR_BLUR = 1.6;
/**
 * The blur (std dev, px) of glass at `tint` whose shorter side is `side` px: clear glass's 1.6 px
 * mixed with the regular blur (`glassBlur`, or none when ThemeConfig `glassBlur` is off).
 */
export declare function glassBlurAt(side: number, tint: number, blurOn: boolean): number;
/**
 * Saturation applied to the blurred backdrop before the veil: the veil keeps 13–29% of the
 * backdrop's brightness but ~70% of its colour, so saturation makes up the difference.
 */
export declare const GLASS_SATURATE: {
    readonly light: {
        readonly small: 5.5;
        readonly large: 2.2;
    };
    readonly dark: {
        readonly small: 2.9;
        readonly large: 2.4;
    };
};
/** Share of the theme surface laid over the backdrop (`--lab-glass-fill*` mix in the tokens). */
export declare const GLASS_VEIL: {
    readonly light: {
        readonly small: 0.87;
        readonly large: 0.71;
    };
    readonly dark: {
        readonly small: 0.75;
        readonly large: 0.72;
    };
};
/**
 * Rim light, the twin of iOS's (research/liquid-glass/LIGHT-EDGES.md): a layer of white laid over the
 * material at the inner edge. Its alpha at depth `d` (px inward from the outline) and angle `a`
 * between the edge normal and the light axis (lit at both ends of the axis) is
 * `(w0 + w1 · |cos a|^p) · max(0, 1 - (d / width)³)`: flat over the outer ~⅔ px, gone by `width`,
 * nothing outside the outline. Clear (tint 0) and regular (tint 1) are the measured ends; the tint
 * mixes every parameter linearly. In dark appearance clear glass adds light that scales with the
 * backdrop instead (`GLASS_EDGE.add`), so its white layer stays faint.
 */
export interface GlassRim {
    w0: number;
    w1: number;
    p: number;
    width: number;
}
export declare const GLASS_RIM: Record<'light' | 'dark', {
    clear: GlassRim;
    regular: GlassRim;
}>;
/** The widest rim (px) at any tint: how deep the rim's samples must reach. */
export declare const GLASS_RIM_MAX_WIDTH = 1.2;
/** The rim at one tint and colour scheme. */
export declare function glassRim(tint: number, scheme: 'light' | 'dark'): GlassRim;
/**
 * Rim alpha at `depth` px inside the outline, where `cosine` is the cosine of the angle between the
 * edge normal and the light axis (its sign does not matter: both ends are lit). 0 outside.
 */
export declare function rimLayer(depth: number, cosine: number, rim: GlassRim): number;
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
export declare const GLASS_EDGE: {
    readonly mask: {
        readonly width: 1;
        readonly floor: 0.2;
    };
    readonly thin: {
        readonly light: 0.35;
        readonly dark: 0.3;
    };
    readonly add: {
        readonly base: 0.106;
        readonly gain: 0.31;
    };
};
/** The edge mask at `depth` px inside the outline (0 outside), for `cosine` against the light axis. */
export declare function edgeMask(depth: number, cosine: number): number;
/**
 * The edge terms for one material, as the coefficients of `x + k1 · x · E + k3 · E`, where
 * `surface` is the grey level of the veil's colour (0–1). The veil `material.veil` is laid over
 * the result afterwards, so thinning it by K needs `veil · K / (1 - veil)` here.
 */
export declare function glassEdgeTerms(tint: number, scheme: 'light' | 'dark', material: GlassMaterial, surface: number): {
    k1: number;
    k3: number;
};
/** Shadow under the glass: black at the token's alpha, `dy` px down, blurred by `blur` (std dev). */
export declare const GLASS_SHADOW: {
    readonly dy: 7.5;
    readonly blur: 19.5;
};
/**
 * Measured clear glass (FINDINGS §3): no veil, no shadow, full colour, and a slight brightness
 * lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
 */
export declare const GLASS_CLEAR: {
    readonly gain: 1.03;
    readonly offset: 0.076;
};
/**
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) an app gets by default: the midpoint, a
 * light veil (~40 %), like iOS 27's default slider position. Flutter's `glassTintDefault` matches.
 */
export declare const GLASS_TINT_DEFAULT = 0.5;
/**
 * The least tint of glass bars floating over scrolling content (a ScrollArea's app bar and dock,
 * a TabView's tab bar): their labels sit on moving content, so the glass stays this veiled even
 * when the theme's tint is clearer (GlassBar). Flutter's `glassBarTint` matches.
 */
export declare const GLASS_BAR_TINT = 0.85;
/** A tint clamped to 0–1; anything that is not a finite number is the default. */
export declare function clampGlassTint(tint: unknown): number;
/**
 * The material at one tint, for one colour scheme and glass size. Mixed in sRGB over the backdrop:
 * `out = veil · surface + (1 - veil) · (gain · saturate(backdrop) + offset)`.
 */
export interface GlassMaterial {
    /** Share of the theme surface laid over the backdrop (`--lab-glass-fill*`). */
    veil: number;
    /** Saturation of the backdrop under the veil (`--lab-glass-saturate*`). */
    saturate: number;
    /** Brightness lift of the backdrop (clear glass): `gain · backdrop + offset`. */
    gain: number;
    offset: number;
    /** Share of the measured regular shadow's alpha (`--lab-glass-shadow-*`). */
    shadow: number;
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
export declare function glassMaterial(tint: number, scheme: 'light' | 'dark', size: GlassSize): GlassMaterial;
/**
 * The lift `gain · x + offset` as CSS filter functions, `contrast(c) brightness(b)` (applied in
 * that order: contrast maps x to `c · x + (1 - c) / 2`, brightness multiplies by b).
 */
export declare function liftFilter(gain: number, offset: number): {
    contrast: number;
    brightness: number;
};
//# sourceMappingURL=material.d.ts.map