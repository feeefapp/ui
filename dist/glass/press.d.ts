import type { GlassShape } from './geometry.js';
/**
 * Press response for interactive glass, after Apple's `.interactive()`: a pressed bubble swells a
 * little, then stretches toward a dragging finger with rubber-band resistance, and springs back on
 * release. Pure, so the Flutter twin can share the numbers.
 */
/** How much a pressed bubble grows. */
export declare const GLASS_PRESS_SCALE = 1.06;
/** The farthest (px) a bubble stretches toward a drag, however far the finger goes. */
export declare const GLASS_STRETCH_LIMIT = 12;
/** Fraction of the stretch the bubble's content follows. */
export declare const GLASS_CONTENT_FOLLOW = 0.4;
/** Stretch (px) for a drag of `dx`, `dy` from where the press started: quick at first, then resisting. */
export declare function glassStretch(dx: number, dy: number, limit?: number): {
    x: number;
    y: number;
};
/**
 * The drawn shape of a pressed bubble: scaled around its centre, then lengthened toward the
 * stretch and slightly narrowed across it, so it reads as one soft drop pulled by the finger.
 */
export declare function pressedShape(shape: GlassShape, scale: number, stretchX: number, stretchY: number): GlassShape;
//# sourceMappingURL=press.d.ts.map