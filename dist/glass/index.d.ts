/** Liquid glass: one material per row of bubbles, with merging, splitting and moving light. */
export { GlassContainer, GlassScope, useGlassOptions, useGlassStyle } from './container.js';
export type { GlassContainerProps } from './container.js';
export { GlassContext, GlassBackdropContext } from './context.js';
export type { GlassMemberOptions, GlassMotion, GlassRegistry } from './context.js';
export { boundsOf, clampRadius, glassClusters, glassPaths, GLASS_MERGE_BASE, GLASS_MERGE_GAP, mergeWidth, rectGap, shapeDistance, shapePath, smoothMin, unionDistance, unionLoops, } from './geometry.js';
export type { GlassRect, GlassShape } from './geometry.js';
export { DEFAULT_GLASS_LIGHT, glassLightToward, rimGradient } from './light.js';
export type { GlassLight } from './light.js';
export { planGlassTransition } from './transitions.js';
export type { GlassBirth, GlassDeath, GlassPlan } from './transitions.js';
export { GLASS_BEZEL, GLASS_BEZEL_POWER, GLASS_LARGE_SIDE, GLASS_REFRACTION, GLASS_SIZE_EXPONENT, displacementMap, refractionAt, refractionScale, supportsRefraction, supportsElementRefraction, } from './refraction.js';
export { GLASS_BLUR, GLASS_CLEAR, GLASS_RIM, GLASS_RIM_STOPS, GLASS_SATURATE, GLASS_SHADOW, GLASS_SMALL_SIDE, GLASS_TINT_DEFAULT, GLASS_VEIL, clampGlassTint, glassBlur, glassMaterial, glassSize, liftFilter, rimAlpha, } from './material.js';
export type { GlassMaterial, GlassSize } from './material.js';
export { adaptiveGlassTone, backdropTone } from './adaptive.js';
export type { BackdropSample, GlassTone } from './adaptive.js';
export { glassStretch, pressedShape } from './press.js';
//# sourceMappingURL=index.d.ts.map