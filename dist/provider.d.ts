import type { ReactNode } from 'react';
import { type LabServices } from './services.js';
import { type LabThemeMode } from './theme.js';
import type { LabThemeConfig } from './theme-config.js';
import { type LabI18nSource } from './i18n.js';
import './workspace.css';
/** Composition root: install context once and keep leaf widgets independent. */
export declare function LabProvider({ children, services, i18n, initialTheme, enableCornerFallback, theme, }: {
    children: ReactNode;
    services?: Partial<LabServices>;
    /** Locale, direction, translations and URL from the host app. */
    i18n?: LabI18nSource;
    initialTheme?: LabThemeMode;
    /** Opt in to SVG corners only on browsers without native corner-shape support. */
    enableCornerFallback?: boolean;
    /** App-level look: palette, density, radius. See theme-config.ts. */
    theme?: LabThemeConfig;
}): import("react").JSX.Element;
//# sourceMappingURL=provider.d.ts.map