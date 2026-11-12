import type { CSSProperties } from 'react';
import type { Performance } from './performance.js';
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
 * - `data-lab-motion`   → `full` / `reduced` / `none` (system.css; `motionOf()` in physics/motion-value.ts)
 * - `metrics` → size variables (`--lab-control-height`, `--lab-toolbar-item`, …) that replace the density's
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
     * Floating glass: `liquid` (default) is clear glass with the liquid effect: it bends what is
     * behind its rim, lights up toward the pointer and responds to presses; `transparent` is the
     * same clear glass and morphs without that effect (no bend, a fixed light, no press response);
     * `solid` paints chrome on opaque surfaces (like reduced transparency) for dense tools.
     */
    glass?: GlassStyle;
    /**
     * The Liquid Glass slider, `0` clear … `1` tinted: how much of the theme surface veils what is
     * behind the glass. `0` is measured clear glass (no veil, no shadow, a slight brightness lift),
     * `1` the measured regular material (veil 71–87 %, strong saturation, soft shadow); the default
     * `0` uses the clear reference material consistently across web glass.
     * Clamped to 0–1 (glass/material.ts `glassMaterial` holds the curve).
     */
    glassTint?: number;
    /** Blur the backdrop with the measured blur (2.9px on controls → 5.2px on panels). Default false: sharp. */
    glassBlur?: boolean;
    /**
     * Bend the backdrop at the glass edges with the measured refraction profile. Default true.
     * Chromium filters the backdrop directly. Firefox bends only glass given a backdropSource
     * (a separate, non-scrolling background layer); elsewhere it keeps the CSS material.
     */
    glassRefraction?: boolean;
    /**
     * Motion: `full` (default) animates; `reduced` behaves as if the reader asked for reduced motion
     * (springs jump, transitions become instant or short fades, glass light stays still); `none`
     * stops every animation and transition, ambient ones included (pixel textures, loaders, glass
     * sampling). The reader's own reduced-motion setting still applies when it is stricter.
     */
    motion?: Motion;
    /**
     * How much the effects may cost (`Performance`, performance.ts). `auto` (default) keeps the full
     * look and steps down to `light` on weak devices (little memory, few cores, no hardware GPU) and
     * on devices whose frames measure slow; `light` keeps the glass look (tint, rim, shadow) as
     * `transparent` glass that filters nothing behind it (no backdrop blur or refraction), and
     * bubbles never merge. Resolved in the browser by `ThemeProvider`; server-rendered attributes show
     * the configured glass until it runs.
     */
    performance?: Performance;
    /**
     * Control sizes, overriding the density's. Each value set here replaces that size at every
     * density (density supplies the rest), so an app can keep the iOS defaults and only change, say,
     * its toolbar height. Lengths are CSS pixels (Flutter logical pixels in the twin).
     */
    metrics?: Metrics;
}
/** Small / regular / large values of one size (px). Unset sizes keep the density's. */
export interface MetricScale {
    small?: number;
    regular?: number;
    large?: number;
}
/** A width × height pair (px). Unset sides keep the density's. */
export interface MetricSize {
    width?: number;
    height?: number;
}
/**
 * Size overrides for `ThemeConfig.metrics`. Defaults (comfortable density) are the iOS 26 controls
 * measured in the simulator; compact is one step down, thin two. Every value becomes a CSS variable
 * on `<html>`.
 */
export interface Metrics {
    /** Button heights, also the square of icon-only buttons: small 30, regular 36, large 52 (`--lab-control-small`, `--lab-control-height`, `--lab-control-large`). */
    controlHeight?: MetricScale;
    /** A text button's side padding: 10 / 12 / 20 (`--lab-control-padding-small`, `--lab-control-padding`, `--lab-control-padding-large`). */
    controlPadding?: MetricScale;
    /** A button label's font size: 15 / 17 / 17; the line height is the size × 1.3 rounded (`--lab-control-font*`). */
    controlFont?: MetricScale;
    /** Text field heights: small 36, regular 44 (`--lab-field-height-small`, `--lab-field-height`; `large` is ignored). */
    fieldHeight?: MetricScale;
    /** Workspace action rows and tool-sidebar headings: 44 (`--lab-row-height`). Navigation items are regular buttons (`controlHeight`). */
    rowHeight?: number;
    /** A toolbar bubble's outer height: 44; controls inside are 6px less (`--lab-toolbar-item`). */
    toolbarItem?: number;
    /** Space between toolbar groups: the shell gap, 8 (`--lab-toolbar-gap`). */
    toolbarGap?: number;
    /** A floating bar's inset from its panel's sides: the shell gap, 8 (`--lab-toolbar-inset`). */
    toolbarInset?: number;
    /** From a segmented control's edge to its pill, and between options: 2 (`--lab-segmented-inset`). Its height is `controlHeight.regular`. */
    segmentedInset?: number;
    /** A switch track: 63 × 28 (`--lab-switch-width`, `--lab-switch-height`). */
    switchSize?: MetricSize;
    /** The switch thumb and the thin slider's thumb: 37 × 24 (`--lab-thumb-width`, `--lab-thumb-height`). */
    thumbSize?: MetricSize;
    /** The thin slider's rail: 6 (`--lab-slider-track`). */
    sliderTrack?: number;
    /** An inset-grouped list row: 54 (`--lab-list-row-height`). */
    listRowHeight?: number;
    /** An inset-grouped list card's corner radius before the radius scale: 26 (`--lab-list-corner`). */
    listRadius?: number;
    /** List rows' side padding, headers and separators: 16 (`--lab-list-inset`). */
    listInset?: number;
    /** The keyboard focus ring's line width: 2 (`--lab-focus-ring-width`). */
    focusRingWidth?: number;
    /** The keyboard focus ring's distance outside the control: 1 (`--lab-focus-ring-offset`). */
    focusRingOffset?: number;
    /** The workspace scaffold's expanded sidebar: 304 / 248 / 224 by density (`--lab-sidebar-width`). */
    sidebarWidth?: number;
    /** The workspace scaffold's navigation rail: 64 / 52 / 44 by density (`--lab-navigation-rail-width`). */
    railWidth?: number;
    /** The one chrome gap G: window, top bar, content panel, sidebar items, toolbar groups, floating bars and ScrollArea edges: 8 (`--lab-shell-gap`). `toolbarGap` and `toolbarInset` default to it. */
    shellGap?: number;
}
/** Color palette: `lab` (Feeef green) or `mono` (black and white). */
export type Palette = 'lab' | 'mono';
/** Size scale for controls, rows, spacing and sidebars. */
export type Density = 'comfortable' | 'compact' | 'thin';
/** What floating glass is: clear glass with the liquid effect, clear glass without it, or opaque surfaces. */
export type GlassStyle = 'liquid' | 'transparent' | 'solid';
/** How much the kit animates: everything, the reduced-motion paths, or nothing at all. */
export type Motion = 'full' | 'reduced' | 'none';
/**
 * How long (seconds) the short crossfade that replaces a movement under reduced motion lasts:
 * `seconds` under `reduced`, 0 under `none`, which animates nothing at all. Every reduced-motion
 * crossfade takes its length from here (Flutter: `motionFade()`).
 */
export declare function motionFade(motion: Motion, seconds: number): number;
/** `on` / `off`, as boolean options appear on `<html>`. */
export type GlassSwitch = 'on' | 'off';
/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export declare const THEME_DEFAULTS: Required<Omit<ThemeConfig, 'primary' | 'metrics'>>;
/**
 * Ready-made looks, as plain partial configs: spread one and override anything,
 * `{ ...PROFILES.balanced, palette: 'mono' }`. The kit still checks what the browser supports
 * (refraction, blur; `glassCapabilities()`), so a profile never needs a per-browser variant.
 * - `quality`: liquid glass with refraction and blur, full motion.
 * - `balanced`: transparent glass (no liquid effect) without refraction or blur, full motion.
 * - `performance`: opaque chrome and no motion at all, for slow devices and dense tools.
 */
export declare const PROFILES: {
    quality: {
        glass: "liquid";
        glassRefraction: true;
        glassBlur: true;
        motion: "full";
    };
    balanced: {
        glass: "transparent";
        glassRefraction: false;
        glassBlur: false;
        motion: "full";
    };
    performance: {
        glass: "solid";
        glassRefraction: false;
        glassBlur: false;
        motion: "none";
    };
};
/** `#abc` / `#aabbcc` → [r, g, b] in 0–255, or null for anything else. */
export declare function parseHexColor(color: string): [number, number, number] | null;
/** Black-ish or white text for a background color, whichever has more contrast (WCAG ratio). */
export declare function readableTextOn(rgb: [number, number, number]): string;
/** Dark mode lifts the primary toward white (as the Lab's own green does); mirrors the CSS mix. */
export declare function darkModePrimary([r, g, b]: [number, number, number]): [number, number, number];
/** The variable names `metrics` can set; `applyThemeConfig` clears the ones a new config drops. */
export declare const METRIC_VARIABLE_NAMES: readonly string[];
/** `metrics` as CSS variables: finite, non-negative values only, in px. */
export declare function metricVariables(metrics?: Metrics): Record<string, string>;
/**
 * Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout:
 * `data-lab-palette`, `data-lab-density`, `data-lab-glass`, `data-lab-glass-blur`,
 * `data-lab-glass-refraction`, `data-lab-motion`, `data-lab-primary` (when set) and the style variables
 * (`--lab-radius-scale`, `--lab-glass-tint`, the seed colours, and one variable per set `metrics` value).
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5, `glassTint` to 0–1, and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export declare function themeAttributes(config?: ThemeConfig): {
    'data-lab-palette': Palette;
    'data-lab-density': Density;
    'data-lab-glass': GlassStyle;
    'data-lab-glass-blur': GlassSwitch;
    'data-lab-glass-refraction': GlassSwitch;
    'data-lab-motion': Motion;
    'data-lab-primary'?: '';
    style: CSSProperties;
};
/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `themeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export declare function applyThemeConfig(element: HTMLElement, config?: ThemeConfig): void;
//# sourceMappingURL=theme-config.d.ts.map