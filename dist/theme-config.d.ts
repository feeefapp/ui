import type { CSSProperties } from 'react';
/**
 * App-level theme configuration. An app chooses its look here, once, and passes it to
 * `LabProvider theme={…}`; components never branch on it. Everything is expressed as
 * attributes and CSS variables on `<html>`, which the kit's stylesheets read:
 *
 * - `data-lab-palette`  → color tokens (theme-tokens.css)
 * - `data-lab-primary` + `--lab-seed*` → a custom primary color the tokens derive from
 * - `data-lab-density`  → control/row heights, padding and spacing (system.css)
 * - `--lab-radius-scale` → every corner radius (system.css and component CSS)
 *
 * Server-rendered hosts also spread `labThemeAttributes(config)` onto `<html>` so the first
 * paint is already themed; the provider keeps the attributes in sync on the client.
 */
export interface LabThemeConfig {
    /** `lab` (default): Feeef green. `mono`: black and white; color only where it means something. */
    palette?: LabPalette;
    /**
     * Primary color as hex (`#2563eb`). Primary actions, focus, brand and pixel tints follow it in
     * light and dark mode; with `lab` the neutral surfaces are tinted toward it too, with `mono`
     * they stay grey. Text on primary picks black or white for contrast. Unset: the palette's own.
     */
    primary?: string;
    /** `comfortable` (default), `compact` (denser desktop chrome) or `thin` (smaller still). Touch keeps 44px targets. */
    density?: LabDensity;
    /** Corner scale: `1` (default) is the Lab's rounding, `0.5` half, `0` square. Clamped to 0–1.5. */
    radius?: number;
}
/** Color palette: `lab` (Feeef green) or `mono` (black and white). */
export type LabPalette = 'lab' | 'mono';
/** Size scale for controls, rows, spacing and sidebars. */
export type LabDensity = 'comfortable' | 'compact' | 'thin';
/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export declare const LAB_THEME_DEFAULTS: Required<Omit<LabThemeConfig, 'primary'>>;
/** `#abc` / `#aabbcc` → [r, g, b] in 0–255, or null for anything else. */
export declare function parseHexColor(color: string): [number, number, number] | null;
/** Black-ish or white text for a background color, whichever has more contrast (WCAG ratio). */
export declare function readableTextOn(rgb: [number, number, number]): string;
/** Dark mode lifts the primary toward white (as the Lab's own green does); mirrors the CSS mix. */
export declare function darkModePrimary([r, g, b]: [number, number, number]): [number, number, number];
/**
 * Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout:
 * `data-lab-palette`, `data-lab-density`, `data-lab-primary` (when set) and the style variables.
 * Unset options use `LAB_THEME_DEFAULTS`; `radius` is clamped to 0–1.5 and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `LabThemeProvider` sets it.
 */
export declare function labThemeAttributes(config?: LabThemeConfig): {
    'data-lab-palette': LabPalette;
    'data-lab-density': LabDensity;
    'data-lab-primary'?: '';
    style: CSSProperties;
};
/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `labThemeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export declare function applyLabThemeConfig(element: HTMLElement, config?: LabThemeConfig): void;
//# sourceMappingURL=theme-config.d.ts.map