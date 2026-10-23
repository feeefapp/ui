import { clampGlassTint, GLASS_TINT_DEFAULT } from './glass/material.js';
/**
 * How long (seconds) the short crossfade that replaces a movement under reduced motion lasts:
 * `seconds` under `reduced`, 0 under `none`, which animates nothing at all. Every reduced-motion
 * crossfade takes its length from here (Flutter: `motionFade()`).
 */
export function motionFade(motion, seconds) {
    return motion === 'none' ? 0 : seconds;
}
/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export const THEME_DEFAULTS = {
    palette: 'lab',
    density: 'comfortable',
    radius: 1,
    glass: 'liquid',
    glassTint: GLASS_TINT_DEFAULT,
    glassBlur: false,
    glassRefraction: true,
    motion: 'full',
};
/**
 * Ready-made looks, as plain partial configs: spread one and override anything,
 * `{ ...PROFILES.balanced, palette: 'mono' }`. The kit still checks what the browser supports
 * (refraction, blur; `glassCapabilities()`), so a profile never needs a per-browser variant.
 * - `quality`: liquid glass with refraction and blur, full motion.
 * - `balanced`: still glass without refraction or blur, full motion.
 * - `performance`: opaque chrome and no motion at all, for slow devices and dense tools.
 */
export const PROFILES = {
    quality: { glass: 'liquid', glassRefraction: true, glassBlur: true, motion: 'full' },
    balanced: { glass: 'still', glassRefraction: false, glassBlur: false, motion: 'full' },
    performance: { glass: 'solid', glassRefraction: false, glassBlur: false, motion: 'none' },
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
        glass: config.glass ?? THEME_DEFAULTS.glass,
        glassTint: clampGlassTint(config.glassTint),
        glassBlur: config.glassBlur ?? THEME_DEFAULTS.glassBlur,
        glassRefraction: config.glassRefraction ?? THEME_DEFAULTS.glassRefraction,
        motion: config.motion === 'reduced' || config.motion === 'none' ? config.motion : 'full',
        radius,
        primary: config.primary && parseHexColor(config.primary) ? config.primary.toLowerCase() : null,
        metrics: config.metrics ?? {},
    };
}
/** Every metric and the CSS variable it writes. */
const METRIC_VARIABLES = [
    [(m) => m.controlHeight?.small, '--lab-control-small'],
    [(m) => m.controlHeight?.regular, '--lab-control-height'],
    [(m) => m.controlHeight?.large, '--lab-control-large'],
    [(m) => m.controlPadding?.small, '--lab-control-padding-small'],
    [(m) => m.controlPadding?.regular, '--lab-control-padding'],
    [(m) => m.controlPadding?.large, '--lab-control-padding-large'],
    [(m) => m.controlFont?.small, '--lab-control-font-small'],
    [(m) => m.controlFont?.regular, '--lab-control-font'],
    [(m) => m.controlFont?.large, '--lab-control-font-large'],
    [(m) => m.fieldHeight?.small, '--lab-field-height-small'],
    [(m) => m.fieldHeight?.regular, '--lab-field-height'],
    [(m) => m.rowHeight, '--lab-row-height'],
    [(m) => m.toolbarItem, '--lab-toolbar-item'],
    [(m) => m.toolbarGap, '--lab-toolbar-gap'],
    [(m) => m.toolbarInset, '--lab-toolbar-inset'],
    [(m) => m.segmentedInset, '--lab-segmented-inset'],
    [(m) => m.switchSize?.width, '--lab-switch-width'],
    [(m) => m.switchSize?.height, '--lab-switch-height'],
    [(m) => m.thumbSize?.width, '--lab-thumb-width'],
    [(m) => m.thumbSize?.height, '--lab-thumb-height'],
    [(m) => m.sliderTrack, '--lab-slider-track'],
    [(m) => m.listRowHeight, '--lab-list-row-height'],
    [(m) => m.listRadius, '--lab-list-corner'],
    [(m) => m.listInset, '--lab-list-inset'],
    [(m) => m.focusRingWidth, '--lab-focus-ring-width'],
    [(m) => m.focusRingOffset, '--lab-focus-ring-offset'],
    [(m) => m.sidebarWidth, '--lab-sidebar-width'],
    [(m) => m.railWidth, '--lab-navigation-rail-width'],
    [(m) => m.shellGap, '--lab-shell-gap'],
];
/** The variable names `metrics` can set; `applyThemeConfig` clears the ones a new config drops. */
export const METRIC_VARIABLE_NAMES = METRIC_VARIABLES.map(([, name]) => name);
/** `metrics` as CSS variables: finite, non-negative values only, in px. */
export function metricVariables(metrics = {}) {
    const vars = {};
    for (const [read, name] of METRIC_VARIABLES) {
        const value = read(metrics);
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
            vars[name] = `${value}px`;
    }
    return vars;
}
/** The CSS variables a config sets on `<html>`. */
function variables(theme) {
    const vars = {
        '--lab-radius-scale': String(theme.radius),
        '--lab-glass-tint': String(theme.glassTint),
        ...metricVariables(theme.metrics),
    };
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
 * `data-lab-palette`, `data-lab-density`, `data-lab-glass`, `data-lab-glass-blur`,
 * `data-lab-glass-refraction`, `data-lab-motion`, `data-lab-primary` (when set) and the style variables
 * (`--lab-radius-scale`, `--lab-glass-tint`, the seed colours, and one variable per set `metrics` value).
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5, `glassTint` to 0–1, and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export function themeAttributes(config) {
    const theme = resolve(config);
    return {
        'data-lab-palette': theme.palette,
        'data-lab-density': theme.density,
        'data-lab-glass': theme.glass,
        'data-lab-glass-blur': theme.glassBlur ? 'on' : 'off',
        'data-lab-glass-refraction': theme.glassRefraction ? 'on' : 'off',
        'data-lab-motion': theme.motion,
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
    element.setAttribute('data-lab-glass', theme.glass);
    element.setAttribute('data-lab-glass-blur', theme.glassBlur ? 'on' : 'off');
    element.setAttribute('data-lab-glass-refraction', theme.glassRefraction ? 'on' : 'off');
    element.setAttribute('data-lab-motion', theme.motion);
    if (theme.primary)
        element.setAttribute('data-lab-primary', '');
    else
        element.removeAttribute('data-lab-primary');
    for (const name of [...SEED_VARS, ...METRIC_VARIABLE_NAMES])
        element.style.removeProperty(name);
    for (const [name, value] of Object.entries(variables(theme)))
        element.style.setProperty(name, value);
}
//# sourceMappingURL=theme-config.js.map