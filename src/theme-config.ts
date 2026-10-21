import type { CSSProperties } from 'react'

/**
 * App-level theme configuration. An app chooses its look here, once, and passes it to
 * `LabProvider theme={…}`; components never branch on it. Everything is expressed as
 * attributes and CSS variables on `<html>`, which the kit's stylesheets read:
 *
 * - `data-lab-palette`  → color tokens (theme-tokens.css)
 * - `data-lab-density`  → control/row heights, padding and spacing (system.css)
 * - `--lab-radius-scale` → every corner radius (system.css and component CSS)
 *
 * Server-rendered hosts also spread `labThemeAttributes(config)` onto `<html>` so the first
 * paint is already themed; the provider keeps the attributes in sync on the client.
 */
export interface LabThemeConfig {
  /** `lab` (default): Feeef green. `mono`: black and white; color only where it means something. */
  palette?: LabPalette
  /** `comfortable` (default) or `compact`: denser desktop chrome. Touch keeps 44px targets. */
  density?: LabDensity
  /** Corner scale: `1` (default) is the Lab's rounding, `0.5` half, `0` square. Clamped to 0–1.5. */
  radius?: number
}

export type LabPalette = 'lab' | 'mono'
export type LabDensity = 'comfortable' | 'compact'

export const LAB_THEME_DEFAULTS: Required<LabThemeConfig> = {
  palette: 'lab',
  density: 'comfortable',
  radius: 1,
}

function resolve(config: LabThemeConfig = {}): Required<LabThemeConfig> {
  const radius = Number.isFinite(config.radius) ? Math.min(1.5, Math.max(0, config.radius!)) : 1
  return { ...LAB_THEME_DEFAULTS, ...config, radius }
}

/** Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout. */
export function labThemeAttributes(config?: LabThemeConfig): {
  'data-lab-palette': LabPalette
  'data-lab-density': LabDensity
  style: CSSProperties
} {
  const theme = resolve(config)
  return {
    'data-lab-palette': theme.palette,
    'data-lab-density': theme.density,
    style: { '--lab-radius-scale': String(theme.radius) } as CSSProperties,
  }
}

/** Applies the config to an element (the provider uses `document.documentElement`). */
export function applyLabThemeConfig(element: HTMLElement, config?: LabThemeConfig): void {
  const theme = resolve(config)
  element.setAttribute('data-lab-palette', theme.palette)
  element.setAttribute('data-lab-density', theme.density)
  element.style.setProperty('--lab-radius-scale', String(theme.radius))
}
