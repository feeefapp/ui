/** Menus: the menu's glass shape (a GlassContainer shape born out of its button), its motion and the app bounds every floating panel respects. */
export { MenuSurface, MENU_COLLISION_PADDING } from './menu-surface'
export type { MenuSurfaceProps } from './menu-surface'
export { FloatingBoundary, FloatingPortalScope, useFloatingBoundary } from './boundary'
export { physicalMenuSide, sidePanelFallback } from './placement'
export type { MenuSide, PlacementRect } from './placement'
export type { FloatingBoundaryProps } from './boundary'
export {
  MENU_MORPH,
  menuAlign,
  menuCloseDuration,
  menuContentCloseFrame,
  menuContentOpenFrame,
} from './morph-model'
export type { MenuContentFrame } from './morph-model'
