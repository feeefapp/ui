import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LabServicesProvider } from './services.js';
import { LabThemeProvider } from './theme.js';
import { LabScaffoldProvider } from './scaffold.js';
import { LabI18nProvider } from './i18n.js';
import { FO_FONTS_CSS } from './brand/fonts.js';
import './workspace.css';
/** Composition root: install context once and keep leaf widgets independent. */
export function LabProvider({ children, services, i18n, initialTheme = 'system', enableCornerFallback = false, theme, }) {
    return (_jsx(LabServicesProvider, { services: services, children: _jsx(LabI18nProvider, { ...i18n, children: _jsx(LabThemeProvider, { initialMode: initialTheme, enableCornerFallback: enableCornerFallback, config: theme, children: _jsxs(LabScaffoldProvider, { children: [_jsx("style", { children: FO_FONTS_CSS }), children] }) }) }) }));
}
//# sourceMappingURL=provider.js.map