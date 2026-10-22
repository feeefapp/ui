/** Glass taller than this (px) never flips. */
export const GLASS_ADAPT_MAX_HEIGHT = 72;
/** Parses the colours getComputedStyle returns: `rgb()`, `rgba()` and `color(srgb …)`. */
export function parseCssColor(value) {
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(value.trim());
    if (rgb) {
        const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4]);
        return { r: Number(rgb[1]) / 255, g: Number(rgb[2]) / 255, b: Number(rgb[3]) / 255, a: alpha };
    }
    const srgb = /^color\(\s*srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(value.trim());
    if (srgb) {
        const alpha = srgb[4] === undefined ? 1 : srgb[4].endsWith('%') ? Number.parseFloat(srgb[4]) / 100 : Number(srgb[4]);
        return { r: Number(srgb[1]), g: Number(srgb[2]), b: Number(srgb[3]), a: alpha };
    }
    return null;
}
/** WCAG relative luminance of an sRGB colour with channels in 0–1. */
export function luminance({ r, g, b }) {
    const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
/**
 * The tone behind the glass: the nearest region that names its tone, else the first mostly opaque
 * background colour. Mid-tones (neither clearly dark nor light) give `null`.
 */
export function backdropTone(samples) {
    for (const sample of samples) {
        if (sample.tone === 'dark' || sample.tone === 'light')
            return sample.tone;
        const color = sample.color ? parseCssColor(sample.color) : null;
        if (!color || color.a < 0.5)
            continue;
        const value = luminance(color);
        return value < 0.18 ? 'dark' : value > 0.45 ? 'light' : null;
    }
    return null;
}
/**
 * The tone a glass container should switch to, or `null` to keep the theme's: only small glass
 * flips, only when every sampled point agrees, and only when that differs from the color mode.
 */
export function adaptiveGlassTone(tones, mode, height) {
    if (!tones.length || height > GLASS_ADAPT_MAX_HEIGHT)
        return null;
    const first = tones[0];
    if (!first || tones.some((tone) => tone !== first))
        return null;
    return first === mode ? null : first;
}
//# sourceMappingURL=adaptive.js.map