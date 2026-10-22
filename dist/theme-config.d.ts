import type { CSSProperties } from 'react';
/**
 * App-level theme configuration. An app chooses its look here, once, and passes it to
 * `Provider theme={…}`; components never branch on it. Everything is expressed as
 * attributes and CSS variables on `<html>`, which the kit's stylesheets read:
 *
 * - `data-lab-palette`  → color tokens (theme-tokens.css)
 * - `data-lab-primary` + `--lab-seed*` → a custom primary color the tokens derive from
 * - `data-lab-density`  → control/row heights, padding and spacing (system.css)
 * - `--lab-radius-scale` → every corner radius (system.css and component CSS)
 * - `data-lab-glass`    → how floating glass behaves (glass/glass.css, GlassContainer)
 * - `data-lab-glass-renderer` → filled glass, blurred CSS glass or canvas refraction (glass/glass.css)
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
     * `frosted` keeps the blurred material and its morphs with a still light and no press response;
     * `solid` paints chrome on opaque surfaces (like reduced transparency) for dense tools.
     */
    glass?: GlassStyle;
    /**
     * How much work glass does on the web. `fill` (default) paints a filled glass colour with the
     * light and shadow but no backdrop blur: the cheapest, smooth on any phone. `css` adds the
     * backdrop blur. `canvas` also bends the content behind the glass at its edges (refraction) with
     * displacement maps built on a canvas whenever the glass settles: heaviest, Chromium only, other
     * browsers keep `css`.
     */
    glassRenderer?: GlassRenderer;
}
/** Color palette: `lab` (Feeef green) or `mono` (black and white). */
export type Palette = 'lab' | 'mono';
/** Size scale for controls, rows, spacing and sidebars. */
export type Density = 'comfortable' | 'compact' | 'thin';
/** How floating glass behaves: moving liquid glass, still frosted glass, or opaque surfaces. */
export type GlassStyle = 'liquid' | 'frosted' | 'solid';
/** How glass is drawn on the web: filled (no blur), blurred in CSS, or blurred plus canvas-built refraction. */
export type GlassRenderer = 'fill' | 'css' | 'canvas';
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
 * `data-lab-palette`, `data-lab-density`, `data-lab-glass`, `data-lab-glass-renderer`, `data-lab-primary` (when set) and the style variables.
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5 and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export declare function themeAttributes(config?: ThemeConfig): {
    'data-lab-palette': Palette;
    'data-lab-density': Density;
    'data-lab-glass': GlassStyle;
    'data-lab-glass-renderer': GlassRenderer;
    'data-lab-primary'?: '';
    style: CSSProperties;
};
/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `themeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export declare function applyThemeConfig(element: HTMLElement, config?: ThemeConfig): void;
//# sourceMappingURL=theme-config.d.ts.map