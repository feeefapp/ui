import type { CSSProperties } from 'react'

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
 * - `data-lab-glass-renderer` → CSS glass or canvas-built refraction (GlassContainer)
 *
 * Server-rendered hosts also spread `themeAttributes(config)` onto `<html>` so the first
 * paint is already themed; the provider keeps the attributes in sync on the client.
 */
export interface ThemeConfig {
  /** `lab` (default): Feeef green. `mono`: black and white; color only where it means something. */
  palette?: Palette
  /**
   * Primary color as hex (`#2563eb`). Primary actions, focus, brand and pixel tints follow it in
   * light and dark mode; with `lab` the neutral surfaces are tinted toward it too, with `mono`
   * they stay grey. Text on primary picks black or white for contrast. Unset: the palette's own.
   */
  primary?: string
  /** `comfortable` (default), `compact` (denser desktop chrome) or `thin` (smaller still). Touch keeps 44px targets. */
  density?: Density
  /** Corner scale: `1` (default) is the Lab's rounding, `0.5` half, `0` square. Clamped to 0–1.5. */
  radius?: number
  /**
   * Floating glass: `liquid` (default) moves, lights up toward the pointer and responds to presses;
   * `frosted` keeps the blurred material and its morphs with a still light and no press response;
   * `solid` paints chrome on opaque surfaces (like reduced transparency) for dense tools.
   */
  glass?: GlassStyle
  /**
   * How glass is drawn on the web: `css` (default) is blur, light and shadow in CSS and SVG, cheap
   * everywhere. `canvas` also bends the content behind the glass at its edges (refraction) with
   * displacement maps built on a canvas whenever the glass settles: heavier, Chromium only, other
   * browsers keep `css`.
   */
  glassRenderer?: GlassRenderer
}

/** Color palette: `lab` (Feeef green) or `mono` (black and white). */
export type Palette = 'lab' | 'mono'
/** Size scale for controls, rows, spacing and sidebars. */
export type Density = 'comfortable' | 'compact' | 'thin'
/** How floating glass behaves: moving liquid glass, still frosted glass, or opaque surfaces. */
export type GlassStyle = 'liquid' | 'frosted' | 'solid'
/** How glass is drawn on the web: CSS only, or CSS plus canvas-built refraction. */
export type GlassRenderer = 'css' | 'canvas'

/** The config every unset option falls back to. `primary` unset means the palette's own color. */
export const THEME_DEFAULTS: Required<Omit<ThemeConfig, 'primary'>> = {
  palette: 'lab',
  density: 'comfortable',
  radius: 1,
  glass: 'liquid',
  glassRenderer: 'css',
}

type Resolved = Required<Omit<ThemeConfig, 'primary'>> & { primary: string | null }

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** `#abc` / `#aabbcc` → [r, g, b] in 0–255, or null for anything else. */
export function parseHexColor(color: string): [number, number, number] | null {
  if (!HEX.test(color)) return null
  const hex = color.length === 4 ? color.replace(/[0-9a-f]/gi, (c) => c + c) : color
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

const luminance = ([r, g, b]: [number, number, number]) => {
  const linear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const DARK_TEXT = '#111411'
const LIGHT_TEXT = '#ffffff'

/** Black-ish or white text for a background color, whichever has more contrast (WCAG ratio). */
export function readableTextOn(rgb: [number, number, number]): string {
  const l = luminance(rgb)
  return contrast(l, luminance([0x11, 0x14, 0x11])) >= contrast(l, 1) ? DARK_TEXT : LIGHT_TEXT
}

/** Dark mode lifts the primary toward white (as the Lab's own green does); mirrors the CSS mix. */
export function darkModePrimary([r, g, b]: [number, number, number]): [number, number, number] {
  return [r, g, b].map((c) => Math.round(c * 0.7 + 255 * 0.3)) as [number, number, number]
}

function resolve(config: ThemeConfig = {}): Resolved {
  const radius = Number.isFinite(config.radius) ? Math.min(1.5, Math.max(0, config.radius!)) : 1
  // `??`, not spread: the provider passes explicit `undefined` for unset options.
  return {
    palette: config.palette ?? THEME_DEFAULTS.palette,
    density: config.density ?? THEME_DEFAULTS.density,
    glass: config.glass ?? THEME_DEFAULTS.glass,
    glassRenderer: config.glassRenderer ?? THEME_DEFAULTS.glassRenderer,
    radius,
    primary: config.primary && parseHexColor(config.primary) ? config.primary.toLowerCase() : null,
  }
}

/** The CSS variables a config sets on `<html>`. */
function variables(theme: Resolved): Record<string, string> {
  const vars: Record<string, string> = { '--lab-radius-scale': String(theme.radius) }
  const rgb = theme.primary && parseHexColor(theme.primary)
  if (rgb) {
    vars['--lab-seed'] = theme.primary!
    vars['--lab-seed-on'] = readableTextOn(rgb)
    vars['--lab-seed-on-dark'] = readableTextOn(darkModePrimary(rgb))
  }
  return vars
}

/**
 * Attributes for the root `<html>` element (React props), e.g. in a Next.js root layout:
 * `data-lab-palette`, `data-lab-density`, `data-lab-glass`, `data-lab-glass-renderer`, `data-lab-primary` (when set) and the style variables.
 * Unset options use `THEME_DEFAULTS`; `radius` is clamped to 0–1.5 and an invalid `primary`
 * is ignored. Color mode (`data-lab-theme`) is not included; `ThemeProvider` sets it.
 */
export function themeAttributes(config?: ThemeConfig): {
  'data-lab-palette': Palette
  'data-lab-density': Density
  'data-lab-glass': GlassStyle
  'data-lab-glass-renderer': GlassRenderer
  'data-lab-primary'?: ''
  style: CSSProperties
} {
  const theme = resolve(config)
  return {
    'data-lab-palette': theme.palette,
    'data-lab-density': theme.density,
    'data-lab-glass': theme.glass,
    'data-lab-glass-renderer': theme.glassRenderer,
    ...(theme.primary ? { 'data-lab-primary': '' as const } : {}),
    style: variables(theme) as CSSProperties,
  }
}

const SEED_VARS = ['--lab-seed', '--lab-seed-on', '--lab-seed-on-dark']

/**
 * Applies the config to an element (the provider uses `document.documentElement`): the same
 * attributes and variables as `themeAttributes`, set imperatively; a removed `primary` is cleared.
 */
export function applyThemeConfig(element: HTMLElement, config?: ThemeConfig): void {
  const theme = resolve(config)
  element.setAttribute('data-lab-palette', theme.palette)
  element.setAttribute('data-lab-density', theme.density)
  element.setAttribute('data-lab-glass', theme.glass)
  element.setAttribute('data-lab-glass-renderer', theme.glassRenderer)
  if (theme.primary) element.setAttribute('data-lab-primary', '')
  else element.removeAttribute('data-lab-primary')
  for (const name of SEED_VARS) element.style.removeProperty(name)
  for (const [name, value] of Object.entries(variables(theme))) element.style.setProperty(name, value)
}
