/** Public core API. Feature widgets may import dedicated modules directly. */
export { LabProvider } from './provider.js';
export { LabI18nProvider, LabLanguageSwitcher, useLabI18n } from './i18n.js';
export type { LabI18n, LabI18nSource } from './i18n.js';
export { LAB_LANGUAGES, labDirectionFor } from './i18n-core.js';
export type { LabLanguageCode } from './i18n-core.js';
export { LabServicesProvider, useLabServices } from './services.js';
export type { LabPreferences, LabServices } from './services.js';
export { LabThemeProvider, LabThemeSwitch, useLabTheme } from './theme.js';
export type { LabThemeMode } from './theme.js';
export { LabButton, LabInput, LabTextarea, LabSelect, LabOption, LabLabel, LabModal, LabBox, LabText, LabLink, LabForm, LabList, LabListItem, LabDivider, } from './ui.js';
export { LabScaffoldProvider, LabGlassGroup, LabFloatingLayer, LabViewTransition, useLabNavigation, useFloatingReserve, } from './scaffold.js';
export { LabScrollArea, LabScrollGradientOverlay } from './scroll/index.js';
export type { LabScrollAreaProps, LabScrollGradientOverlayProps } from './scroll/index.js';
export { LabDock } from './dock/index.js';
export type { LabDockProps } from './dock/index.js';
export { LabActionsBar, LabActionsWidthProvider } from './actions/index.js';
export type { LabAction, LabCommandAction, LabToggleAction, LabGroupAction, LabActionsBarProps, } from './actions/index.js';
export type { LabButtonProps, LabButtonVariant, LabControlSize, LabButtonAppearance } from './ui.js';
export { LabSegmentedControl } from './ui.js';
export type { LabSegmentOption } from './ui.js';
export { LAB_UI_MESSAGES } from './messages.js';
export { flattenLabTranslations, translateLab } from './i18n-core.js';
export { labLocaleUrl } from './i18n.js';
export { cn } from './utils.js';
//# sourceMappingURL=index.d.ts.map