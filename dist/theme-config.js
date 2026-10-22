/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export const THEME_DEFAULTS = {
    palette: 'lab',
    density: 'comfortable',
    radius: 1,
};
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** `#abc` / `#aabbcc` → [r, g, b] in 0–255, or null for anything else. */
export function parseHexColor(color) {
    if (!HEX.test(color))
        return null;
    const hex = color.length === 4 ? color.replace(/[0-9a-f]/gi, (c) => c + c) : color;
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
const luminance = ([r, g, b]) => {
    const linear = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const DARK_TEXT = '#111411';
const LIGHT_TEXT = '#ffffff';
/** Black-ish or white text for a background color, whichever has more contrast (WCAG ratio). */
export function readableTextOn(rgb) {
    const l = luminance(rgb);
    return contrast(l, luminance([0x11, 0x14, 0x11])) >= contrast(l, 1) ? DARK_TEXT : LIGHT_TEXT;
}
/** Dark mode lifts the primary toward white (as the Lab's own green does); mirrors the CSS mix. */
export function darkModePrimary([r, g, b]) {
    return [r, g, b].map((c) => Math.round(c * 0.7 + 255 * 0.3));
}
function resolve(config = {}) {
    const radius = Number.isFinite(config.radius) ? Math.min(1.5, Math.max(0, config.radius)) : 1;
    // `??`, not spread: the provider passes explicit `undefined` for unset options.
    return {
        palette: config.palette ?? THEME_DEFAULTS.palette,
        density: config.density ?? THEME_DEFAULTS.density,
        radius,
        primary: config.primary && parseHexColor(config.primary) ? config.primary.toLowerCase() : null,
    };
}
/** The CSS variables a config sets on `<html>`. */
function variables(theme) {
    const vars = { '--lab-radius-scale': String(theme.radius) };
    const rgb = theme.primary && parseHexColor(theme.primary);
    if (rgb) {
        vars['--lab-seed'] = theme.primary;
        vars['--lab-seed-on'] = readableTextOn(rgb);
        vars['--lab-seed-on-dark'] = readableTextOn(darkModePrimary(rgb));
    }
    return vars;
}
/**
 * Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout:
 * `data-lab-palette`, `data-lab-density`, `data-lab-primary` (when set) and the style variables.
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5 and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export function themeAttributes(config) {
    const theme = resolve(config);
    return {
        'data-lab-palette': theme.palette,
        'data-lab-density': theme.density,
        ...(theme.primary ? { 'data-lab-primary': '' } : {}),
        style: variables(theme),
    };
}
const SEED_VARS = ['--lab-seed', '--lab-seed-on', '--lab-seed-on-dark'];
/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `themeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export function applyThemeConfig(element, config) {
    const theme = resolve(config);
    element.setAttribute('data-lab-palette', theme.palette);
    element.setAttribute('data-lab-density', theme.density);
    if (theme.primary)
        element.setAttribute('data-lab-primary', '');
    else
        element.removeAttribute('data-lab-primary');
    for (const name of SEED_VARS)
        element.style.removeProperty(name);
    for (const [name, value] of Object.entries(variables(theme)))
        element.style.setProperty(name, value);
}
//# sourceMappingURL=theme-config.js.map