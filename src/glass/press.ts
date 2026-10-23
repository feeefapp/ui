import { rubberBand } from '../physics/spring'
import type { GlassRect, GlassShape } from './geometry'

/**
 * Press response for interactive glass, after Apple's `.interactive()`: a pressed bubble swells a
 * little, then stretches toward a dragging finger with rubber-band resistance, and springs back on
 * release. Pure, so the Flutter twin can share the numbers.
 */

/** How much a pressed bubble grows. */
export const GLASS_PRESS_SCALE = 1.06
/** The farthest (px) a bubble stretches toward a drag, however far the finger goes. */
export const GLASS_STRETCH_LIMIT = 12
/** Fraction of the stretch the bubble's content follows. */
export const GLASS_CONTENT_FOLLOW = 0.4
/** Radius (px) the touch glow starts from; it spreads to `glassGlowRadius` on `SPRINGS.smooth`. */
export const GLASS_GLOW_START = 8

/** How far the touch glow under a press spreads over glass `width` px wide. */
export function glassGlowRadius(width: number) {
  return Math.max(120, width)
}

/** Recover layout from the content transform we last painted, before measuring it again. */
export function glassLayoutRect(rect: GlassRect, offset: { x: number; y: number }, contentScale = 1): GlassRect {
  const width = rect.width / contentScale
  const height = rect.height / contentScale
  return {
    x: rect.x - offset.x + (rect.width - width) / 2,
    y: rect.y - offset.y + (rect.height - height) / 2,
    width,
    height,
  }
}

/** Stretch (px) for a drag of `dx`, `dy` from where the press started: quick at first, then resisting. */
export function glassStretch(dx: number, dy: number, limit = GLASS_STRETCH_LIMIT) {
  return { x: rubberBand(dx, limit * 4) / 4, y: rubberBand(dy, limit * 4) / 4 }
}

/**
 * The drawn shape of a pressed bubble: scaled around its centre, then lengthened toward the
 * stretch and slightly narrowed across it, so it reads as one soft drop pulled by the finger.
 */
export function pressedShape(shape: GlassShape, scale: number, stretchX: number, stretchY: number): GlassShape {
  const width = shape.width * scale
  const height = shape.height * scale
  const ax = Math.abs(stretchX)
  const ay = Math.abs(stretchY)
  const w = width + ax - ay * 0.25
  const h = height + ay - ax * 0.25
  const cx = shape.x + shape.width / 2 + stretchX / 2
  const cy = shape.y + shape.height / 2 + stretchY / 2
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    width: Math.max(0, w),
    height: Math.max(0, h),
    // Drawing clamps the radius to half the shorter side, so a narrowed drop stays round.
    radius: shape.radius * scale,
    ...(shape.cornerExponent === undefined ? {} : { cornerExponent: shape.cornerExponent }),
  }
}
