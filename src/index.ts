/** Public core API. Feature widgets may import dedicated modules directly. */
export { LabProvider } from './provider'
export { LabI18nProvider, LabLanguageSwitcher, useLabI18n } from './i18n'
export type { LabI18n, LabI18nSource } from './i18n'
export { LAB_LANGUAGES, labDirectionFor } from './i18n-core'
export type { LabLanguageCode } from './i18n-core'
export { LabServicesProvider, useLabServices } from './services'
export type { LabPreferences, LabServices } from './services'
export { LabThemeProvider, LabThemeSwitch, useLabTheme } from './theme'
export type { LabThemeMode } from './theme'
export { LAB_THEME_DEFAULTS, applyLabThemeConfig, labThemeAttributes } from './theme-config'
export type { LabDensity, LabPalette, LabThemeConfig } from './theme-config'
export {
  LabButton,
  LabInput,
  LabTextarea,
  LabSelect,
  LabOption,
  LabLabel,
  LabModal,
  LabBox,
  LabText,
  LabLink,
  LabForm,
  LabList,
  LabListItem,
  LabDivider,
} from './ui'
export {
  LabScaffoldProvider,
  LabGlassGroup,
  LabFloatingLayer,
  LabViewTransition,
  useLabNavigation,
  useFloatingReserve,
} from './scaffold'

export { LabScrollArea, LabScrollGradientOverlay } from './scroll'
export type { LabScrollAreaProps, LabScrollGradientOverlayProps } from './scroll'
export { LabDock } from './dock'
export type { LabDockProps } from './dock'
export { LabActionsBar, LabActionsWidthProvider } from './actions'
export type {
  LabAction,
  LabCommandAction,
  LabToggleAction,
  LabGroupAction,
  LabActionsBarProps,
} from './actions'

export type { LabButtonProps, LabButtonVariant, LabControlSize, LabButtonAppearance } from './ui'

export { LabSegmentedControl } from './ui'
export type { LabSegmentOption } from './ui'

export { LAB_UI_MESSAGES } from './messages'
export { flattenLabTranslations, translateLab } from './i18n-core'
export { labLocaleUrl } from './i18n'
export { cn } from './utils'

export { LabToolbarSearch } from './toolbar-search'
export type { LabToolbarSearchProps } from './toolbar-search'
