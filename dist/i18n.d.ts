import { type ReactNode } from 'react';
import './actions/actions.css';
/** What the host app passes to `LabProvider i18n={…}` (or `LabI18nProvider`). */
export interface LabI18nSource {
    /** Active locale code, e.g. `en`, `ar`, `fr`. Default: `ar`. */
    locale?: string;
    /** Text direction. Default: derived from `locale` (`rtl` for ar, fa, he, ur). */
    dir?: 'rtl' | 'ltr';
    /** Locales the language switcher offers. Default: every built-in language (ar, fr, en). */
    availableLocales?: readonly string[];
    /** Flat `{ "lab.…": "ICU message" }` map; merged over the kit's built-in strings for `locale`. */
    translations?: Record<string, string>;
    /** Current path + query. Defaults to `window.location`. */
    url?: string;
    /** Opens a URL after a language change. Defaults to the `navigate` service. */
    navigate?: (url: string) => void;
}
/** The value of `useLabI18n()`. */
export interface LabI18n {
    /** Active locale code. */
    locale: string;
    /** Active text direction. */
    dir: 'rtl' | 'ltr';
    /** Locales the host serves. */
    availableLocales: readonly string[];
    /** Translates `key` with ICU `params`; returns the key itself when no string exists. */
    t: (key: string, params?: Record<string, string | number | Date>) => string;
    /** Navigates to the current URL with `?hl=<locale>`. Ignores unknown or current locales. */
    setLocale: (locale: string) => void;
}
/** Locale, direction and `t()` for the nearest `LabI18nProvider` (Arabic, RTL, keys as text without one). */
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
/**
 * Language picker for Lab chrome; lists only server-available locales and renders nothing
 * when fewer than two are available. Choosing one calls `setLocale`.
 */
export declare function LabLanguageSwitcher({ className, iconOnly, }: {
    className?: string;
    /** Show a globe icon button with a menu instead of the labeled select. */
    iconOnly?: boolean;
}): import("react").JSX.Element | null;
//# sourceMappingURL=i18n.d.ts.map