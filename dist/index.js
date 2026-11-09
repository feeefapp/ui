/** Public core API. Feature widgets may import dedicated modules directly. */
export { Provider } from './provider.js';
export { I18nProvider, LanguageSwitcher, useI18n } from './i18n.js';
export { LANGUAGES, directionFor } from './i18n-core.js';
export { ServicesProvider, useServices } from './services.js';
export { ThemeProvider, ThemeSwitch, usePerformanceTier, useTheme } from './theme.js';
export { MEASURE, measuredPerformance, readDeviceTraits, resolvePerformance, slowWindow } from './performance.js';
export { PROFILES, THEME_DEFAULTS, applyThemeConfig, motionFade, themeAttributes } from './theme-config.js';
export { glassCapabilities } from './glass/refraction.js';
export { motionOf, prefersReducedMotion } from './physics/motion-value.js';
export { useMotion, useReducedMotion } from './physics/react.js';
export { Button, SquareSlot, Input, Textarea, Select, Option, Label, Alert, Modal, Sheet, useSheet, Box, Text, Link, Form, List, ListItem, Divider, } from './ui.js';
export { ScaffoldProvider, GlassGroup, FloatingLayer, ViewTransition, useNavigation, useFloatingReserve, } from './scaffold.js';
export { FloatingBoundary, MenuSurface, useFloatingBoundary } from './menu/index.js';
export { PresentationBody, PresentationDock, PresentationHeader, } from './presentation/index.js';
export { Panel, PanelHost, PanelStack, usePanelStack } from './containers/panel-host.js';
export { allocatePanelWidths, pushPanel, replacePanel, closePanel } from './containers/panel-model.js';
export { RefreshController, ScrollArea, ScrollGradientOverlay, useRefreshController, useShellGap } from './scroll/index.js';
export { Dock } from './dock/index.js';
export { ActionsBar, ActionsWidthProvider } from './actions/index.js';
export { SegmentedControl } from './ui.js';
export { UI_MESSAGES } from './messages.js';
export { englishText, flattenTranslations, translateLab } from './i18n-core.js';
export { localeUrl } from './i18n.js';
export { cn } from './utils.js';
export { ToolbarSearch } from './toolbar-search.js';
//# sourceMappingURL=index.js.map