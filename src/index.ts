/** Public core API. Feature widgets may import dedicated modules directly. */
export { Provider } from './provider'
export { I18nProvider, LanguageSwitcher, useI18n } from './i18n'
export type { I18n, I18nSource } from './i18n'
export { LANGUAGES, directionFor } from './i18n-core'
export type { LanguageCode } from './i18n-core'
export { ServicesProvider, useServices } from './services'
export type { Preferences, Services } from './services'
export { ThemeProvider, ThemeSwitch, usePerformanceTier, useTheme } from './theme'
export { MEASURE, measuredPerformance, readDeviceTraits, resolvePerformance, slowWindow } from './performance'
export type { DeviceTraits, Performance, PerformanceTier } from './performance'
export type { ThemeMode } from './theme'
export { PROFILES, THEME_DEFAULTS, applyThemeConfig, motionFade, themeAttributes } from './theme-config'
export type { Density, MetricScale, MetricSize, Metrics, Motion, Palette, ThemeConfig } from './theme-config'
export { glassCapabilities } from './glass/refraction'
export { motionOf, prefersReducedMotion } from './physics/motion-value'
export { useMotion, useReducedMotion } from './physics/react'
export {
  Button,
  SquareSlot,
  Input,
  Textarea,
  Select,
  Option,
  Label,
  Alert,
  Modal,
  Sheet,
  useSheet,
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

export {
  PresentationBody,
  PresentationDock,
  PresentationHeader,
} from './presentation'
export type { SheetDetent, SheetProps, SheetState } from './containers/sheet'
export { Panel, PanelHost, PanelStack, usePanelStack } from './containers/panel-host'
export type { PanelProps, PanelEntry, PanelHostProps, PanelStackState, PanelChangeReason } from './containers/panel-host'
export { allocatePanelWidths, pushPanel, replacePanel, closePanel } from './containers/panel-model'
export type { PanelSizing, PanelIdentity, PanelWidth, PanelWidths } from './containers/panel-model'
export type {
  AlertAction,
  AlertActionRole,
  AlertProps,
  ModalProps,
  PresentationBodyProps,
  PresentationChromeProps,
  PresentationDockProps,
  PresentationHeaderProps,
} from './presentation'

export { RefreshController, ScrollArea, ScrollGradientOverlay, useRefreshController, useShellGap } from './scroll'
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

export type { ButtonProps, ButtonVariant, ControlSize, ButtonAppearance, SquareSlotProps } from './ui'

export { SegmentedControl } from './ui'
export type { SegmentOption, SegmentTone } from './ui'

export { UI_MESSAGES } from './messages'
export { englishText, flattenTranslations, translateLab } from './i18n-core'
export type { Translate } from './i18n-core'
export { localeUrl } from './i18n'
export { cn } from './utils'

export { ToolbarSearch } from './toolbar-search'
export type { ToolbarSearchProps } from './toolbar-search'

export { Notice, type NoticeProps } from './primitives/notice'
