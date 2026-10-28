/** Liquid glass: one material per row of bubbles, with merging, splitting and moving light. */
export { GlassBar, GlassContainer, GlassScope, useGlassOptions, useGlassStyle } from './container.js';
export type { GlassContainerProps } from './container.js';
export { GlassContext, GlassBarContext } from './context.js';
export type { GlassMemberOptions, GlassMotion, GlassRegistry } from './context.js';
export { boundsOf, clampRadius, glassClusters, glassPaths, GLASS_MERGE_BASE, GLASS_MERGE_GAP, mergeWidth, rectGap, shapeDistance, shapePath, smoothMin, unionDistance, unionLoops, } from './geometry.js';
export type { GlassRect, GlassShape } from './geometry.js';
export { DEFAULT_GLASS_LIGHT, glassLightToward } from './light.js';
export type { GlassLight } from './light.js';
export { GLASS_MAX_SIDE, GLASS_MAX_SPAN, glassMemberRect } from './member-bounds.js';
export { GLASS_FOLLOW_ATTRIBUTE, GLASS_INSTANT_ATTRIBUTE, GLASS_ORIGIN, GLASS_ORIGIN_HUG, GLASS_ORIGIN_SEED, GLASS_ORIGIN_SPRINGS, GLASS_SETTLED_EVENT, GLASS_SETTLE_MS, glassOrigin, settleGlass, glassChangesAtOnce, glassSeed, planGlassTransition, sameGlassRow } from './transitions.js';
export type { GlassBirth, GlassDeath, GlassPlan } from './transitions.js';
export { GLASS_BEZEL, GLASS_BEZEL_POWER, GLASS_LARGE_SIDE, GLASS_REFRACTION, GLASS_SIZE_EXPONENT, displacementMap, glassCapabilities, LENS_BEND, lensBend, lensDisplacementMap, refractionAt, refractionScale, supportsRefraction, supportsElementRefraction, } from './refraction.js';
export { GLASS_BLUR, GLASS_CLEAR, GLASS_CLEAR_BLUR, GLASS_EDGE, GLASS_HAIRLINE, GLASS_MENU, GLASS_REGULAR_LIFT, GLASS_RIM, GLASS_RIM_MAX_WIDTH, GLASS_SATURATE, GLASS_SHADOW, GLASS_SMALL_SIDE, GLASS_BAR_TINT, GLASS_FROSTED_BLUR_SCALE, GLASS_FLAT_FLOOR, GLASS_TINT_DEFAULT, GLASS_VEIL, clampGlassTint, edgeMask, glassBlur, glassBlurAt, glassEdgeTerms, glassFrostedBlur, glassHairline, glassKindBlur, glassMenuMaterial, glassMaterial, glassRim, glassSize, LENS_MATERIAL, LENS_SHADOW, lensMaterial, liftFilter, rimLayer, } from './material.js';
export type { GlassKind, GlassMaterial, GlassRim, GlassSize } from './material.js';
export type { LensKind } from './refraction.js';
export { GlassLensLayer, lensBends, lensMode } from './lens-layer.js';
export type { LensMode } from './lens-layer.js';
export { adaptiveGlassTone, backdropTone } from './adaptive.js';
export type { BackdropSample, GlassTone } from './adaptive.js';
export { glassStretch, pressedShape } from './press.js';
//# sourceMappingURL=index.d.ts.map