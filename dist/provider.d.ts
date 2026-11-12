import type { ReactNode } from 'react';
import { type Services } from './services.js';
import { type ThemeMode } from './theme.js';
import type { ThemeConfig } from './theme-config.js';
import { type I18nSource } from './i18n.js';
import './workspace.css';
/**
 * Composition root: install context once and keep leaf widgets independent.
 * Renders services → i18n → theme → scaffold (floating layers) and loads the brand fonts.
 * Mount it once around the whole app.
 */
export declare function Provider({ children, services, i18n, initialTheme, enableCornerFallback, theme, }: {
    children: ReactNode;
    /** Platform ports to override (navigate, preferences, clipboard, downloads). */
    services?: Partial<Services>;
    /** Locale, direction, translations and URL from the host app. */
    i18n?: I18nSource;
    /** Color mode used until the reader picks one. Default: `system`. */
    initialTheme?: ThemeMode;
    /** Opt in to SVG corners only on browsers without native corner-shape support. */
    enableCornerFallback?: boolean;
    /** App-level look: palette, density, radius. See theme-config.ts. */
    theme?: ThemeConfig;
}): import("react").JSX.Element;
//# sourceMappingURL=provider.d.ts.map