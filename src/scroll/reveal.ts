import { scrollRevealDelta } from './metrics'
import { prefersReducedMotion } from '../physics/motion-value'

type Alignment = 'nearest' | 'center' | false

/**
 * Scrolls `viewport` the minimum needed to show `child`, honoring the viewport's scroll padding
 * (the floats' reservations). Unlike native scrollIntoView it never moves ancestors or the page.
 * Reduced motion forces an instant scroll.
 */
export function revealScrollChild(
  viewport: HTMLElement | null | undefined,
  child: HTMLElement | null | undefined,
  {
    block = 'nearest',
    inline = 'nearest',
    behavior = 'instant',
  }: { block?: Alignment; inline?: Alignment; behavior?: ScrollBehavior } = {}
) {
  if (!viewport || !child || !viewport.contains(child)) return
  const bounds = viewport.getBoundingClientRect()
  const target = child.getBoundingClientRect()
  const style = getComputedStyle(viewport)
  const padding = (value: string) => Number.parseFloat(value) || 0
  const top = bounds.top + padding(style.scrollPaddingTop)
  const bottom = Math.max(top, bounds.bottom - padding(style.scrollPaddingBottom))
  const left = bounds.left + padding(style.scrollPaddingLeft)
  const right = Math.max(left, bounds.right - padding(style.scrollPaddingRight))
  const dy = block ? scrollRevealDelta(target.top, target.bottom, top, bottom, block) : 0
  const dx = inline ? scrollRevealDelta(target.left, target.right, left, right, inline) : 0
  if (!dx && !dy) return
  viewport.scrollBy({
    top: dy,
    left: dx,
    behavior: prefersReducedMotion() ? 'instant' : behavior,
  })
}
