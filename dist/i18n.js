'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PopoverSurface } from './ui.js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { IntlMessageFormat } from 'intl-messageformat';
import { Check, Globe } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button, Select, Option } from './ui.js';
import './actions/actions.css';
import { LANGUAGES, directionFor } from './i18n-core.js';
import { UI_MESSAGES } from './messages.js';
import { useServices } from './services.js';
const FALLBACK_LOCALE = 'ar';
/** Stable default so the context value is not rebuilt on every render. */
const DEFAULT_LOCALES = LANGUAGES.map((l) => l.code);
const I18nContext = createContext({
    locale: FALLBACK_LOCALE,
    dir: 'rtl',
    availableLocales: DEFAULT_LOCALES,
    t: (key) => key,
    setLocale: () => { },
});
/** Locale, direction and `t()` for the nearest `I18nProvider` (Arabic, RTL, keys as text without one). */
export const useI18n = () => useContext(I18nContext);
/** Append/replace `?hl=<code>` on a path+query URL (mirrors the global provider). */
export function localeUrl(currentUrl, code) {
    try {
        const url = new URL(currentUrl, 'http://localhost');
        url.searchParams.set('hl', code);
        return url.pathname + (url.search || '') + url.hash;
    }
    catch {
        return `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}hl=${encodeURIComponent(code)}`;
    }
}
function makeFormatter(locale) {
    const cache = new Map();
    // Keyed by message, not key, so new translations for the same key are never served stale.
    return (message, params) => {
        let fmt = cache.get(message);
        if (fmt === undefined) {
            try {
                fmt = new IntlMessageFormat(message, locale);
            }
            catch {
                fmt = null;
            }
            cache.set(message, fmt);
        }
        if (!fmt)
            return message;
        try {
            return String(fmt.format(params ?? {}));
        }
        catch {
            return message;
        }
    };
}
/**
 * Locale context. The host owns locale, direction and the flat translations
 * dictionary and passes them in; kit widgets fall back to their built-in
 * strings. Switching language opens the current URL with `?hl=<code>` so the
 * host can persist the choice server-side.
 */
export function I18nProvider({ children, locale: localeProp, dir: dirProp, availableLocales: availableProp, translations: translationsProp, url, navigate: navigateProp, }) {
    const services = useServices();
    const locale = localeProp ?? FALLBACK_LOCALE;
    const dir = dirProp ?? directionFor(locale);
    const translations = useMemo(() => ({ ...(UI_MESSAGES[locale] ?? UI_MESSAGES.en), ...translationsProp }), [locale, translationsProp]);
    const availableLocales = availableProp ?? DEFAULT_LOCALES;
    const navigate = navigateProp ?? services.navigate;
    const formatterRef = useRef(makeFormatter(locale));
    const lastLocaleRef = useRef(locale);
    if (lastLocaleRef.current !== locale) {
        formatterRef.current = makeFormatter(locale);
        lastLocaleRef.current = locale;
    }
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        document.documentElement.lang = locale;
        document.documentElement.dir = dir;
    }, [locale, dir]);
    const value = useMemo(() => {
        const format = formatterRef.current;
        return {
            locale,
            dir,
            availableLocales,
            t: (key, params) => {
                const message = translations[key];
                if (message === undefined)
                    return key;
                if (!message.includes('{'))
                    return message;
                return format(message, (params ?? {}));
            },
            setLocale: (code) => {
                if (!availableLocales.includes(code) || code === locale)
                    return;
                const current = url ||
                    (typeof window !== 'undefined'
                        ? window.location.pathname + window.location.search + window.location.hash
                        : '/');
                navigate(localeUrl(current, code));
            },
        };
    }, [locale, dir, availableLocales, translations, url, navigate]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
/**
 * Language picker for Lab chrome; lists only server-available locales and renders nothing
 * when fewer than two are available. Choosing one calls `setLocale`.
 */
export function LanguageSwitcher({ className, iconOnly = false, }) {
    const { locale, setLocale, availableLocales, t, dir } = useI18n();
    const trigger = useRef(null);
    const [portalContainer, setPortalContainer] = useState();
    const visible = LANGUAGES.filter((l) => availableLocales.includes(l.code));
    if (visible.length < 2)
        return null;
    if (iconOnly)
        return (_jsxs(DropdownMenu.Root, { modal: false, dir: dir, onOpenChange: (open) => {
                if (open)
                    setPortalContainer(trigger.current?.closest('dialog') || undefined);
            }, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx(Button, { ref: trigger, className: className, variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.common.language'), title: visible.find((language) => language.code === locale)?.name, children: _jsx(Globe, { size: 20 }) }) }), _jsx(DropdownMenu.Portal, { container: portalContainer, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(DropdownMenu.Content, { className: "lab-actions-menu", "aria-label": t('lab.common.language'), side: "top", align: "end", sideOffset: 8, collisionPadding: 12, "data-lab-corners": true, children: _jsx(DropdownMenu.RadioGroup, { value: locale, onValueChange: setLocale, children: visible.map((language) => (_jsxs(DropdownMenu.RadioItem, { value: language.code, className: "lab-actions-menu__item", children: [_jsx("span", { className: "lab-actions-menu__leading", children: _jsx(DropdownMenu.ItemIndicator, { children: _jsx(Check, { size: 16 }) }) }), _jsx("span", { lang: language.code, dir: language.dir, children: language.name })] }, language.code))) }) }) }) })] }));
    return (_jsxs("span", { className: className, style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [_jsx(Globe, { size: 16, "aria-hidden": "true" }), _jsx(Select, { hint: t('lab.common.language'), "aria-label": t('lab.common.language'), value: locale, onValueChange: (next) => setLocale(next), children: visible.map((language) => (_jsx(Option, { value: language.code, children: language.name }, language.code))) })] }));
}
//# sourceMappingURL=i18n.js.map