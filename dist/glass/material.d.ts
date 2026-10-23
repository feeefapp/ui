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
 * Rim light: a 1 px line of white along the inner edge. Its alpha follows the angle `a` between
 * the edge's normal and the light axis, lit at both ends of the axis: `base + (peak - base) cos²a`.
 */
export declare const GLASS_RIM: {
    readonly light: {
        readonly base: 0.27;
        readonly peak: 0.72;
    };
    readonly dark: {
        readonly base: 0.14;
        readonly peak: 0.25;
    };
};
/** Rim alpha at `angle` (radians) between the edge normal and the light axis. */
export declare function rimAlpha(angle: number, scheme: 'light' | 'dark'): number;
/**
 * Stops for the rim's gradient line (offset 0 and 1 at the lit ends, through the centre): the
 * share of the lit colour laid over the base rim at each offset, cos² of the angle a round shape's
 * edge makes with the light axis there.
 */
export declare const GLASS_RIM_STOPS: readonly (readonly [number, number])[];
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
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) a web app gets by default: clear,
 * matching the shared reference preset. Flutter retains its existing default.
 */
export declare const GLASS_TINT_DEFAULT = 0;
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