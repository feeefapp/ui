import { cornerShapeParameter, cornerSmoothing } from './geometry'

/**
 * How a CSS corner radius relates to the continuous corner it stands for (system.css
 * `--lab-corner-fit`): 1 where `corner-shape` works, 0.76 where the browser draws quarter circles
 * and the kit shrinks fully smoothed radii to look the same. The fit fades with the corner's
 * smoothing (`cornerSmoothing`): a capsule or circle radius is never shrunk. Code that draws a true
 * continuous corner from a computed CSS radius maps it back with `trueCornerRadius`; code that
 * hands a radius to CSS uses `cssCornerRadius`.
 */
export function cornerFit(): number {
  if (typeof document === 'undefined') return 1
  const fit = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lab-corner-fit'))
  return fit > 0 ? fit : 1
}

/** The share of a radius CSS draws for a corner with this smoothing: 1 - (1 - fit) × smoothing. */
function fitFor(radius: number, width: number, height: number, fit: number) {
  return 1 - (1 - fit) * cornerSmoothing(radius, width, height)
}

/** The CSS border-radius that draws a continuous corner of `radius` on a `width` × `height` box. */
export function cssCornerRadius(radius: number, width: number, height: number, fit = cornerFit()) {
  return fit === 1 ? radius : radius * fitFor(radius, width, height, fit)
}

/**
 * The continuous corner radius a computed CSS border-radius stands for (the inverse of
 * `cssCornerRadius`, which is monotonic in the radius): the radius itself where corner-shape works
 * and for capsules and circles, up to radius / fit for fully smoothed corners.
 */
export function trueCornerRadius(css: number, width: number, height: number, fit = cornerFit()) {
  // Unsmoothed at its own size (a capsule or circle radius): CSS draws it as it is.
  if (fit === 1 || !(css > 0) || cornerSmoothing(css, width, height) === 0) return css
  let low = css
  let high = css / fit
  if (cssCornerRadius(high, width, height, fit) <= css) return high
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (cssCornerRadius(mid, width, height, fit) < css) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/** The CSS `corner-shape` for a corner of `radius` on a `width` × `height` box (`round` at full radius). */
export function cssCornerShape(radius: number, width: number, height: number) {
  const k = cornerShapeParameter(cornerSmoothing(radius, width, height))
  return k === 1 ? 'round' : `superellipse(${Number(k.toFixed(3))})`
}
