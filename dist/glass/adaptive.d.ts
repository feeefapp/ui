/**
 * Adaptive glass, after Apple: small floating glass flips between light and dark to stay legible
 * over what is behind it; large glass does not flip (it would be distracting). The browser can't
 * read pixels behind an element, so a region says what it is (`data-lab-backdrop="dark|light"`,
 * e.g. on photos and video), and otherwise the first solid background colour behind the glass
 * decides. Pure, so the Flutter twin shares the rules.
 */
export type GlassTone = 'light' | 'dark';
/** What lies behind the glass at one point, from front to back. */
export type BackdropSample = {
    tone?: GlassTone | null;
    color?: string | null;
};
/** Glass taller than this (px) never flips. */
export declare const GLASS_ADAPT_MAX_HEIGHT = 72;
/** Parses the colours getComputedStyle returns: `rgb()`, `rgba()` and `color(srgb …)`. */
export declare function parseCssColor(value: string): {
    r: number;
    g: number;
    b: number;
    a: number;
} | null;
/** WCAG relative luminance of an sRGB colour with channels in 0–1. */
export declare function luminance({ r, g, b }: {
    r: number;
    g: number;
    b: number;
}): number;
/**
 * The tone behind the glass: the nearest region that names its tone, else the first mostly opaque
 * background colour. Mid-tones (neither clearly dark nor light) give `null`.
 */
export declare function backdropTone(samples: readonly BackdropSample[]): GlassTone | null;
/**
 * The tone a glass container should switch to, or `null` to keep the theme's: only small glass
 * flips, only when every sampled point agrees, and only when that differs from the color mode.
 */
export declare function adaptiveGlassTone(tones: readonly (GlassTone | null)[], mode: GlassTone, height: number): GlassTone | null;
//# sourceMappingURL=adaptive.d.ts.map