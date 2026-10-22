/** Structural containers: navigation stack, split view and sheet. */
export {
  LabNavigationPage,
  LabNavigationStack,
  useLabNavigationPath,
  useLabNavigationStack,
} from './navigation-stack'
export type {
  LabNavigationPageProps,
  LabNavigationStackPage,
  LabNavigationStackProps,
} from './navigation-stack'
export { diffStack, dragDismissRect, mixRect, slideFrame, zoomFrame } from './stack-model'
export type { LabRect, LabStackChange } from './stack-model'
export { LabSheet } from './sheet'
export type { LabSheetProps, LabSheetDetent } from './sheet'
export { detentHeight, detentHeights, dragHeight, releaseTarget, sheetDim, sheetRecede } from './sheet-model'
export type { LabSheetMetrics } from './sheet-model'
export { LabSplitView, LabSplitPlaceholder } from './split-view'
export type { LabSplitViewProps } from './split-view'
export { LabTabView } from './tab-view'
export type { LabTab, LabTabViewProps } from './tab-view'
export { LabCarousel } from './carousel'
export type { LabCarouselProps } from './carousel'
export { centeredIndex, flickTarget, slideEffect, slideProgress } from './carousel-model'
export {
  LabAdaptiveStack,
  LabViewThatFits,
  useLabElementWidth,
  useLabSizeClass,
} from './adaptive'
export type { LabAdaptiveStackProps, LabSizeClass, LabViewThatFitsProps } from './adaptive'
export { pickFitting } from './adaptive-model'
