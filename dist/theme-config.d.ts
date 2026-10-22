import type { CSSProperties } from 'react';
/**
 * App-level theme configuration. An app chooses its look here, once, and passes it to
 * `Provider theme={…}`; components never branch on it. Everything is expressed as
 * attributes and CSS variables on `<html>`, which the kit's stylesheets read:
 *
 * - `data-lab-palette`  → color tokens (theme-tokens.css)
 * - `data-lab-primary` + `--lab-seed*` → a custom primary color the tokens derive from
 * - `data-lab-density`  → control/row heights, padding and spacing (system.css)
 * - `--lab-radius-scale` → every corner radius, through `--lab-corner-scale` (system.css and component CSS)
 * - `data-lab-glass`    → how floating glass behaves (glass/glass.css, GlassContainer)
 * - `--lab-glass-tint`  → the glass material between clear and tinted (system.css, glass.css)
 * - `data-lab-glass-blur` / `data-lab-glass-refraction` → backdrop blur and edge bending (`on`/`off`)
 *
 * Server-rendered hosts also spread `themeAttributes(config)` onto `<html>` so the first
 * paint is already themed; the provider keeps the attributes in sync on the client.
 */
export interface ThemeConfig {
    /** `lab` (default): Feeef green. `mono`: black and white; color only where it means something. */
    palette?: Palette;
    /**
     * Primary color as hex (`#2563eb`). Primary actions, focus, brand and pixel tints follow it in
     * light and dark mode; with `lab` the neutral surfaces are tinted toward it too, with `mono`
     * they stay grey. Text on primary picks black or white for contrast. Unset: the palette's own.
     */
    primary?: string;
    /** `comfortable` (default), `compact` (denser desktop chrome) or `thin` (smaller still). Touch keeps 44px targets. */
    density?: Density;
    /** Corner scale: `1` (default) is the Lab's rounding, `0.5` half, `0` square. Clamped to 0–1.5. */
    radius?: number;
    /**
     * Floating glass: `liquid` (default) moves, lights up toward the pointer and responds to presses;
     * `still` keeps the same material and its morphs with a fixed light and no press response;
     * `solid` paints chrome on opaque surfaces (like reduced transparency) for dense tools.
     */
    glass?: GlassStyle;
    /**
     * The Liquid Glass slider, `0` clear … `1` tinted: how much of the theme surface veils what is
     * behind the glass. `0` is measured clear glass (no veil, no shadow, a slight brightness lift),
     * `1` the measured regular material (veil 71–87 %, strong saturation, soft shadow); the default
     * `0.5` is a light veil (~40 %) that keeps controls legible and lets the bending show.
     * Clamped to 0–1 (glass/material.ts `glassMaterial` holds the curve).
     */
    glassTint?: number;
    /** Blur the backdrop with the measured blur (2.9px on controls → 5.2px on panels). Default false: sharp. */
    glassBlur?: boolean;
    /**
     * Bend the backdrop at the glass edges with the measured refraction profile. Default true.
     * Chromium only (an SVG displacement map as backdrop filter, built when the glass settles);
     * other browsers show the same glass without the bend.
     */
    glassRefraction?: boolean;
}
/** Color palette: `lab` (Feeef green) or `mono` (black and white). */
export type Palette = 'lab' | 'mono';
/** Size scale for controls, rows, spacing and sidebars. */
export type Density = 'comfortable' | 'compact' | 'thin';
/** How floating glass behaves: moving liquid glass, still glass, or opaque surfaces. */
export type GlassStyle = 'liquid' | 'still' | 'solid';
/** `on` / `off`, as boolean options appear on `<html>`. */
export type GlassSwitch = 'on' | 'off';
/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export declare const THEME_DEFAULTS: Required<Omit<ThemeConfig, 'primary'>>;
/** `#abc` / `#aabbcc` → [r, g, b] in 0–255, or null for anything else. */
export declare function parseHexColor(color: string): [number, number, number] | null;
/** Black-ish or white text for a background color, whichever has more contrast (WCAG ratio). */
export declare function readableTextOn(rgb: [number, number, number]): string;
/** Dark mode lifts the primary toward white (as the Lab's own green does); mirrors the CSS mix. */
export declare function darkModePrimary([r, g, b]: [number, number, number]): [number, number, number];
/**
 * Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout:
 * `data-lab-palette`, `data-lab-density`, `data-lab-glass`, `data-lab-glass-blur`,
 * `data-lab-glass-refraction`, `data-lab-primary` (when set) and the style variables
 * (`--lab-radius-scale`, `--lab-glass-tint`, the seed colours).
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5, `glassTint` to 0–1, and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export declare function themeAttributes(config?: ThemeConfig): {
    'data-lab-palette': Palette;
    'data-lab-density': Density;
    'data-lab-glass': GlassStyle;
    'data-lab-glass-blur': GlassSwitch;
    'data-lab-glass-refraction': GlassSwitch;
    'data-lab-primary'?: '';
    style: CSSProperties;
};
/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `themeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export declare function applyThemeConfig(element: HTMLElement, config?: ThemeConfig): void;
//# sourceMappingURL=theme-config.d.ts.map