import { type ReactNode } from 'react';
import './actions/actions.css';
export interface LabI18nSource {
    locale?: string;
    dir?: 'rtl' | 'ltr';
    availableLocales?: readonly string[];
    translations?: Record<string, string>;
    /** Current path + query. Defaults to `window.location`. */
    url?: string;
    /** Opens a URL after a language change. Defaults to the `navigate` service. */
    navigate?: (url: string) => void;
}
export interface LabI18n {
    locale: string;
    dir: 'rtl' | 'ltr';
    availableLocales: readonly string[];
    t: (key: string, params?: Record<string, string | number | Date>) => string;
    setLocale: (locale: string) => void;
}
export declare const useLabI18n: () => LabI18n;
/** Append/replace `?hl=<code>` on a path+query URL (mirrors the global provider). */
export declare function labLocaleUrl(currentUrl: string, code: string): string;
/**
 * Locale context. The host owns locale, direction and the flat translations
 * dictionary and passes them in; kit widgets fall back to their built-in
 * strings. Switching language opens the current URL with `?hl=<code>` so the
 * host can persist the choice server-side.
 */
export declare function LabI18nProvider({ children, locale: localeProp, dir: dirProp, availableLocales: availableProp, translations: translationsProp, url, navigate: navigateProp, }: LabI18nSource & {
    children: ReactNode;
}): import("react").JSX.Element;
/** Language picker for Lab chrome; lists only server-available locales. */
export declare function LabLanguageSwitcher({ className, iconOnly, }: {
    className?: string;
    iconOnly?: boolean;
}): import("react").JSX.Element | null;
//# sourceMappingURL=i18n.d.ts.map