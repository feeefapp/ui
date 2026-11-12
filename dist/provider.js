import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ServicesProvider } from './services.js';
import { ThemeProvider } from './theme.js';
import { ScaffoldProvider } from './scaffold.js';
import { I18nProvider } from './i18n.js';
import { FO_FONTS_CSS } from './brand/fonts.js';
import './workspace.css';
/**
 * Composition root: install context once and keep leaf widgets independent.
 * Renders services → i18n → theme → scaffold (floating layers) and loads the brand fonts.
 * Mount it once around the whole app.
 */
export function Provider({ children, services, i18n, initialTheme = 'system', enableCornerFallback = false, theme, }) {
    return (_jsx(ServicesProvider, { services: services, children: _jsx(I18nProvider, { ...i18n, children: _jsx(ThemeProvider, { initialMode: initialTheme, enableCornerFallback: enableCornerFallback, config: theme, children: _jsxs(ScaffoldProvider, { children: [_jsx("style", { children: FO_FONTS_CSS }), children] }) }) }) }));
}
//# sourceMappingURL=provider.js.map