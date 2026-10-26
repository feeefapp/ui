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
 * Saturation applied to the backdrop under the regular veil, so that the share of its colour that
 * reaches the eye, `(1 - veil) · gain · saturate`, is iOS 27's: 0.52 in light, 0.99 in dark
 * (Apple's Figma kit, research/liquid-glass/FIGMA-27.md). iOS 27 shows no size dependence (bars,
 * bubbles and 300 pt panels agree within 4 levels), so both sizes carry the same values.
 */
export declare const GLASS_SATURATE: {
    readonly light: {
        readonly small: 1.177;
        readonly large: 1.177;
    };
    readonly dark: {
        readonly small: 1.207;
        readonly large: 1.207;
    };
};
/**
 * Share of the theme surface laid over the backdrop by regular glass (`--lab-glass-fill*`): iOS 27
 * regular glass is `0.443 · x + 0.514` in light and `0.82 · x + 0.094` in dark over grey backdrops;
 * with the surface colour as the veil, that is a 52 % veil plus a slight dimming (light) and, in
 * dark (whose Figma veil is a light grey, not the dark surface), a 5 % veil over a lifted, dimmed
 * backdrop that never clips (`GLASS_REGULAR_LIFT`).
 */
export declare const GLASS_VEIL: {
    readonly light: {
        readonly small: 0.52;
        readonly large: 0.52;
    };
    readonly dark: {
        readonly small: 0.05;
        readonly large: 0.05;
    };
};
/** Regular glass's own `gain · backdrop + offset` under its veil (iOS 27, see GLASS_VEIL). */
export declare const GLASS_REGULAR_LIFT: {
    readonly light: {
        readonly gain: 0.92;
        readonly offset: 0;
    };
    readonly dark: {
        readonly gain: 0.863;
        readonly offset: 0.095;
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
/**
 * Shadow under every glass, clear included (iOS 27's Figma kit: y 8, blur 15 = std dev 7.5):
 * black at `--lab-glass-shadow-alpha` (2 % light, 4 % dark), `dy` px down, blurred by `blur`.
 */
export declare const GLASS_SHADOW: {
    readonly dy: 8;
    readonly blur: 7.5;
    readonly alpha: {
        readonly light: 0.02;
        readonly dark: 0.04;
    };
};
/**
 * The dark hairline iOS 27 draws outside every glass shape, in light and dark (FIGMA-27.md): a
 * ring `ring.width` px wide all round, plus two slivers where the shape, moved `sliver.shift` px
 * left and right and shrunk by `sliver.inset` px, reaches past its own outline (strongest at the
 * left and right, up to 0.5 px). Both darken the backdrop by their strength (plus-darker in iOS;
 * the web paints black at that alpha, Flutter subtracts it). Strengths by colour scheme for clear (tint 0) and regular (tint 1) glass,
 * mixed by the tint. It is the contrast cue that keeps glass readable on white, so it stays with
 * reduced transparency and more contrast.
 */
export declare const GLASS_HAIRLINE: {
    readonly ring: {
        readonly width: 0.5;
    };
    readonly sliver: {
        readonly shift: 1.25;
        readonly inset: 0.75;
    };
    readonly strength: {
        readonly light: {
            readonly clear: {
                readonly ring: 0.2;
                readonly sliver: 0.184;
            };
            readonly regular: {
                readonly ring: 0.09;
                readonly sliver: 0.184;
            };
        };
        readonly dark: {
            readonly clear: {
                readonly ring: 0.349;
                readonly sliver: 0.349;
            };
            readonly regular: {
                readonly ring: 0.349;
                readonly sliver: 0.349;
            };
        };
    };
};
/** The hairline's ring and sliver strengths (0–1 subtracted) at one tint and colour scheme. */
export declare function glassHairline(tint: number, scheme: 'light' | 'dark'): {
    ring: number;
    sliver: number;
};
/**
 * Measured clear glass (FINDINGS §3, and iOS 27's Figma kit): no veil, full colour, and a slight
 * brightness lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
 */
export declare const GLASS_CLEAR: {
    readonly gain: 1.03;
    readonly offset: 0.076;
};
/**
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) an app gets by default: the midpoint, a
 * light veil (26 % light, 2.5 % dark), like iOS 27's default slider position. Flutter's `glassTintDefault` matches.
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
    /** The backdrop's `gain · backdrop + offset` under the veil (clear lift … regular lift). */
    gain: number;
    offset: number;
}
/**
 * The tint curve. Clear (0) and regular (1) are the measured materials (iOS 27); between them every
 * parameter follows the tint in a straight line, except saturation: what stays linear is
 * `(1 - veil) · saturate`, which is 1 for clear glass and 0.565 (light) / 1.147 (dark) for regular
 * glass, so saturation is derived from it and the veil. At the default 0.5 the veil is 26 % (light)
 * / 2.5 % (dark) and the lift is halfway between clear and regular. `glass/material.dart` and the
 * `--lab-glass-*` formulas in system.css and glass.css follow the same curve.
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
 * - `line`: black along a thumb's top edge, `inner` over its inner 1 px and `outer` over 0.5 px
 *   outside it, and `bottom` along its bottom edge: a dark line that shows on light backdrops.
 * - `shadow`: black at `alpha` under it, `dy` px down, blurred by `blur` (CSS blur radius, px).
 * There is no hairline: iOS draws none around control lenses.
 */
export declare const LENS_MATERIAL: {
    readonly pill: {
        readonly veil: 0;
        readonly shade: {
            readonly top: 0.105;
            readonly middle: 0.035;
        };
        readonly rim: {
            readonly light: {
                readonly band: {
                    readonly top: 0.27;
                    readonly side: 0.27;
                    readonly bottom: 0.27;
                };
                readonly edge: {
                    readonly top: 0.45;
                    readonly side: 0.45;
                    readonly bottom: 0.45;
                };
            };
            readonly dark: {
                readonly band: {
                    readonly top: 0.2;
                    readonly side: 0.2;
                    readonly bottom: 0.2;
                };
                readonly edge: {
                    readonly top: 1;
                    readonly side: 1;
                    readonly bottom: 1;
                };
            };
        };
        readonly line: {
            readonly light: {
                readonly inner: 0;
                readonly outer: 0;
                readonly bottom: 0;
            };
            readonly dark: {
                readonly inner: 0;
                readonly outer: 0;
                readonly bottom: 0;
            };
        };
    };
    readonly thumb: {
        readonly veil: 0.09;
        readonly shade: {
            readonly top: 0.14;
            readonly middle: 0.04;
        };
        readonly rim: {
            readonly light: {
                readonly band: {
                    readonly top: 0;
                    readonly side: 0.25;
                    readonly bottom: 0.08;
                };
                readonly edge: {
                    readonly top: 0;
                    readonly side: 0.3;
                    readonly bottom: 0.1;
                };
            };
            readonly dark: {
                readonly band: {
                    readonly top: 0;
                    readonly side: 0.15;
                    readonly bottom: 0.15;
                };
                readonly edge: {
                    readonly top: 0;
                    readonly side: 0.18;
                    readonly bottom: 0.18;
                };
            };
        };
        readonly line: {
            readonly light: {
                readonly inner: 0.35;
                readonly outer: 0.23;
                readonly bottom: 0;
            };
            readonly dark: {
                readonly inner: 0.24;
                readonly outer: 0.31;
                readonly bottom: 0;
            };
        };
    };
    readonly switch: {
        readonly veil: 0.09;
        readonly shade: {
            readonly top: 0.14;
            readonly middle: 0.04;
        };
        readonly rim: {
            readonly light: {
                readonly band: {
                    readonly top: 0.2;
                    readonly side: 0.2;
                    readonly bottom: 0.3;
                };
                readonly edge: {
                    readonly top: 0.25;
                    readonly side: 0.25;
                    readonly bottom: 0.45;
                };
            };
            readonly dark: {
                readonly band: {
                    readonly top: 0.2;
                    readonly side: 0.2;
                    readonly bottom: 0.3;
                };
                readonly edge: {
                    readonly top: 0.25;
                    readonly side: 0.25;
                    readonly bottom: 0.45;
                };
            };
        };
        readonly line: {
            readonly light: {
                readonly inner: 0.55;
                readonly outer: 0;
                readonly bottom: 0.6;
            };
            readonly dark: {
                readonly inner: 0.5;
                readonly outer: 0;
                readonly bottom: 0.6;
            };
        };
    };
};
/** The shadow every control lens casts (LENS-MEASURED.md §3): 0.89 on white just under its bottom
 * edge, gone ~12 px below, barely any above. */
export declare const LENS_SHADOW: {
    readonly dy: 6;
    readonly blur: 11;
    readonly alpha: 0.13;
};
/** A `kind` lens's material at `lens` (0 rest … 1 glass): every alpha eased in with it. */
export declare function lensMaterial(kind: 'pill' | 'thumb' | 'switch', lens: number, scheme: 'light' | 'dark'): {
    veil: number;
    shade: {
        top: number;
        middle: number;
    };
    rim: {
        top: number;
        side: number;
        bottom: number;
    };
    rimEdge: {
        top: number;
        side: number;
        bottom: number;
    };
    line: {
        inner: number;
        outer: number;
        bottom: number;
    };
    shadow: number;
};
/**
 * The container's materials: `regular` is the tint curve above; `menu` is the thick glass menus are
 * made of (they carry text over anything, so content under them never reads as drawn on top of
 * them): regular glass (tint 1, large) veiled at least `GLASS_MENU.veil`, blurred at least
 * `GLASS_MENU.blur` px whatever ThemeConfig `glassBlur` says, and lifted higher off the page by a
 * deeper shadow (`GLASS_MENU.shadow`: `dy` px down, std dev `blur`, the shape shrunk by `inset` px
 * first, black at `alpha`; CSS `0 14px 40px -12px rgb(0 0 0 / 24%)`). The hairline, rim light and
 * lens are the container's as for every glass. The `--lab-menu-*` tokens in menu.css and Flutter's
 * `glassMenuMaterial` match.
 */
export type GlassKind = 'regular' | 'menu';
export declare const GLASS_MENU: {
    readonly veil: 0.88;
    readonly blur: 20;
    readonly shadow: {
        readonly dy: 14;
        readonly blur: 20;
        readonly inset: 12;
        readonly alpha: 0.24;
    };
};
/** The menu material for one colour scheme (see `GLASS_MENU`). */
export declare function glassMenuMaterial(scheme: 'light' | 'dark'): GlassMaterial;
/** Backdrop blur (std dev, px) of `kind` glass whose shorter side is `side` px (see `glassBlurAt`). */
export declare function glassKindBlur(kind: GlassKind, side: number, tint: number, blurOn: boolean): number;
//# sourceMappingURL=material.d.ts.map