/** Public core API. Feature widgets may import dedicated modules directly. */
export { Provider } from './provider'
export { I18nProvider, LanguageSwitcher, useI18n } from './i18n'
export type { I18n, I18nSource } from './i18n'
export { LANGUAGES, directionFor } from './i18n-core'
export type { LanguageCode } from './i18n-core'
export { ServicesProvider, useServices } from './services'
export type { Preferences, Services } from './services'
export { ThemeProvider, ThemeSwitch, useTheme } from './theme'
export type { ThemeMode } from './theme'
export { THEME_DEFAULTS, applyThemeConfig, themeAttributes } from './theme-config'
export type { Density, MetricScale, MetricSize, Metrics, Palette, ThemeConfig } from './theme-config'
export {
  Button,
  Input,
  Textarea,
  Select,
  Option,
  Label,
  Modal,
  Box,
  Text,
  Link,
  Form,
  List,
  ListItem,
  Divider,
} from './ui'
export {
  ScaffoldProvider,
  GlassGroup,
  FloatingLayer,
  ViewTransition,
  useNavigation,
  useFloatingReserve,
} from './scaffold'

export { FloatingBoundary, MenuSurface, useFloatingBoundary } from './menu'
export type { FloatingBoundaryProps, MenuSurfaceProps } from './menu'

export { ScrollArea, ScrollGradientOverlay } from './scroll'
export type { ScrollAreaProps, ScrollGradientOverlayProps } from './scroll'
export { Dock } from './dock'
export type { DockProps } from './dock'
export { ActionsBar, ActionsWidthProvider } from './actions'
export type {
  Action,
  CommandAction,
  ToggleAction,
  GroupAction,
  ActionsBarProps,
} from './actions'

export type { ButtonProps, ButtonVariant, ControlSize, ButtonAppearance } from './ui'

export { SegmentedControl } from './ui'
export type { SegmentOption } from './ui'

export { UI_MESSAGES } from './messages'
export { flattenTranslations, translateLab } from './i18n-core'
export { localeUrl } from './i18n'
export { cn } from './utils'

export { ToolbarSearch } from './toolbar-search'
export type { ToolbarSearchProps } from './toolbar-search'
