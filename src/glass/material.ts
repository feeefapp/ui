/**
 * The glass material: how much it blurs, saturates and veils what is behind it, how its rim
 * catches the light and how far its shadow falls. Our own model, fitted to measurements of
 * rendered Liquid Glass (ui/research/liquid-glass/FINDINGS.md, data/model.json); colours live in
 * the theme tokens (`--lab-glass-*`), sizes and laws here. Pure, so the Flutter twin
 * (`glass/material.dart`) shares the numbers.
 *
 * Glass comes in two sizes: control-sized glass (shorter side up to `GLASS_SMALL_SIDE`) is denser
 * and lets more colour through; larger panels are more transparent.
 */

/** Glass whose shorter side is at most this (px) uses the small, denser material. */
export const GLASS_SMALL_SIDE = 72

export type GlassSize = 'small' | 'large'

export function glassSize(side: number): GlassSize {
  return side <= GLASS_SMALL_SIDE ? 'small' : 'large'
}

/** Backdrop blur (standard deviation, px): this much up to 64 px, growing to `max` on panels. */
export const GLASS_BLUR = { min: 2.9, max: 5.2, from: 64, slope: 0.025 } as const

/** Blur (px, a CSS `blur()` length = standard deviation) for glass whose shorter side is `side` px. */
export function glassBlur(side: number) {
  const { min, max, from, slope } = GLASS_BLUR
  return Math.min(max, Math.max(min, min + (side - from) * slope))
}

/**
 * Saturation applied to the blurred backdrop before the veil: the veil keeps 13–29% of the
 * backdrop's brightness but ~70% of its colour, so saturation makes up the difference.
 */
export const GLASS_SATURATE = {
  light: { small: 5.5, large: 2.2 },
  dark: { small: 2.9, large: 2.4 },
} as const

/** Share of the theme surface laid over the backdrop (`--lab-glass-fill*` mix in the tokens). */
export const GLASS_VEIL = {
  light: { small: 0.87, large: 0.71 },
  dark: { small: 0.75, large: 0.72 },
} as const

/**
 * Rim light: a 1 px line of white along the inner edge. Its alpha follows the angle `a` between
 * the edge's normal and the light axis, lit at both ends of the axis: `base + (peak - base) cos²a`.
 */
export const GLASS_RIM = {
  light: { base: 0.27, peak: 0.72 },
  dark: { base: 0.14, peak: 0.25 },
} as const

/** Rim alpha at `angle` (radians) between the edge normal and the light axis. */
export function rimAlpha(angle: number, scheme: 'light' | 'dark') {
  const { base, peak } = GLASS_RIM[scheme]
  return base + (peak - base) * Math.cos(angle) ** 2
}

/**
 * Stops for the rim's gradient line (offset 0 and 1 at the lit ends, through the centre): the
 * share of the lit colour laid over the base rim at each offset, cos² of the angle a round shape's
 * edge makes with the light axis there.
 */
export const GLASS_RIM_STOPS: readonly (readonly [number, number])[] = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(
  (offset) => [offset, Math.round((1 - 2 * offset) ** 2 * 1000) / 1000] as const
)

/** Shadow under the glass: black at the token's alpha, `dy` px down, blurred by `blur` (std dev). */
export const GLASS_SHADOW = { dy: 7.5, blur: 19.5 } as const

/**
 * Measured clear glass (FINDINGS §3): no veil, no shadow, full colour, and a slight brightness
 * lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
 */
export const GLASS_CLEAR = { gain: 1.03, offset: 0.076 } as const

/**
 * The tint (ThemeConfig `glassTint`, 0 clear … 1 tinted) an app gets by default: the midpoint, a
 * light veil (~40 %), like iOS 27's default slider position. Flutter's `glassTintDefault` matches.
 */
export const GLASS_TINT_DEFAULT = 0.5

/**
 * The least tint of glass bars floating over scrolling content (a ScrollArea's app bar and dock,
 * a TabView's tab bar): their labels sit on moving content, so the glass stays this veiled even
 * when the theme's tint is clearer (GlassBar). Flutter's `glassBarTint` matches.
 */
export const GLASS_BAR_TINT = 0.85

/** A tint clamped to 0–1; anything that is not a finite number is the default. */
export function clampGlassTint(tint: unknown) {
  return typeof tint === 'number' && Number.isFinite(tint) ? Math.min(1, Math.max(0, tint)) : GLASS_TINT_DEFAULT
}

/**
 * The material at one tint, for one colour scheme and glass size. Mixed in sRGB over the backdrop:
 * `out = veil · surface + (1 - veil) · (gain · saturate(backdrop) + offset)`.
 */
export interface GlassMaterial {
  /** Share of the theme surface laid over the backdrop (`--lab-glass-fill*`). */
  veil: number
  /** Saturation of the backdrop under the veil (`--lab-glass-saturate*`). */
  saturate: number
  /** Brightness lift of the backdrop (clear glass): `gain · backdrop + offset`. */
  gain: number
  offset: number
  /** Share of the measured regular shadow's alpha (`--lab-glass-shadow-*`). */
  shadow: number
}

/**
 * The tint curve. Clear (0) and regular (1) are the measured materials; between them every
 * parameter follows the tint in a straight line, except saturation: what stays linear is the
 * share of the backdrop's colour that reaches the eye, `(1 - veil) · saturate`, which is 1 for
 * clear glass and 0.64–0.73 for regular glass (FINDINGS §3), so saturation is derived from it
 * and the veil. At the default 0.5 the veil is 36–44 % (light small 43.5 %, light large 35.5 %,
 * dark small 37.5 %, dark large 36 %), saturation 1.27–1.52, half the regular shadow, half the
 * clear lift. `glass/material.dart` and the `--lab-glass-*` formulas in system.css and glass.css
 * follow the same curve.
 */
export function glassMaterial(tint: number, scheme: 'light' | 'dark', size: GlassSize): GlassMaterial {
  const t = clampGlassTint(tint)
  const regularVeil = GLASS_VEIL[scheme][size]
  const regularColour = (1 - regularVeil) * GLASS_SATURATE[scheme][size]
  const veil = t * regularVeil
  const colour = 1 - t * (1 - regularColour)
  return {
    veil,
    saturate: colour / (1 - veil),
    gain: 1 + (GLASS_CLEAR.gain - 1) * (1 - t),
    offset: GLASS_CLEAR.offset * (1 - t),
    shadow: t,
  }
}

/**
 * The lift `gain · x + offset` as CSS filter functions, `contrast(c) brightness(b)` (applied in
 * that order: contrast maps x to `c · x + (1 - c) / 2`, brightness multiplies by b).
 */
export function liftFilter(gain: number, offset: number) {
  const brightness = gain + 2 * offset
  return { contrast: gain / brightness, brightness }
}
