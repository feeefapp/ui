export const LAB_THEME_DEFAULTS = {
    palette: 'lab',
    density: 'comfortable',
    radius: 1,
};
function resolve(config = {}) {
    const radius = Number.isFinite(config.radius) ? Math.min(1.5, Math.max(0, config.radius)) : 1;
    return { ...LAB_THEME_DEFAULTS, ...config, radius };
}
/** Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout. */
export function labThemeAttributes(config) {
    const theme = resolve(config);
    return {
        'data-lab-palette': theme.palette,
        'data-lab-density': theme.density,
        style: { '--lab-radius-scale': String(theme.radius) },
    };
}
/** Applies the config to an element (the provider uses `document.documentElement`). */
export function applyLabThemeConfig(element, config) {
    const theme = resolve(config);
    element.setAttribute('data-lab-palette', theme.palette);
    element.setAttribute('data-lab-density', theme.density);
    element.style.setProperty('--lab-radius-scale', String(theme.radius));
}
//# sourceMappingURL=theme-config.js.map