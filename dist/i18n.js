'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LabPopoverSurface } from './ui.js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { IntlMessageFormat } from 'intl-messageformat';
import { Check, Globe } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LabButton, LabSelect, LabOption } from './ui.js';
import './actions/actions.css';
import { LAB_LANGUAGES, labDirectionFor } from './i18n-core.js';
import { LAB_UI_MESSAGES } from './messages.js';
import { useLabServices } from './services.js';
const FALLBACK_LOCALE = 'ar';
const LabI18nContext = createContext({
    locale: FALLBACK_LOCALE,
    dir: 'rtl',
    availableLocales: LAB_LANGUAGES.map((l) => l.code),
    t: (key) => key,
    setLocale: () => { },
});
export const useLabI18n = () => useContext(LabI18nContext);
/** Append/replace `?hl=<code>` on a path+query URL (mirrors the global provider). */
export function labLocaleUrl(currentUrl, code) {
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
    return (message, key, params) => {
        let fmt = cache.get(key);
        if (fmt === undefined) {
            try {
                fmt = new IntlMessageFormat(message, locale);
            }
            catch {
                fmt = null;
            }
            cache.set(key, fmt);
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
export function LabI18nProvider({ children, locale: localeProp, dir: dirProp, availableLocales: availableProp, translations: translationsProp, url, navigate: navigateProp, }) {
    const services = useLabServices();
    const locale = localeProp ?? FALLBACK_LOCALE;
    const dir = dirProp ?? labDirectionFor(locale);
    const translations = useMemo(() => ({ ...(LAB_UI_MESSAGES[locale] ?? LAB_UI_MESSAGES.en), ...translationsProp }), [locale, translationsProp]);
    const availableLocales = availableProp ?? LAB_LANGUAGES.map((l) => l.code);
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
                return format(message, key, (params ?? {}));
            },
            setLocale: (code) => {
                if (!availableLocales.includes(code) || code === locale)
                    return;
                const current = url ||
                    (typeof window !== 'undefined'
                        ? window.location.pathname + window.location.search + window.location.hash
                        : '/');
                navigate(labLocaleUrl(current, code));
            },
        };
    }, [locale, dir, availableLocales, translations, url, navigate]);
    return _jsx(LabI18nContext.Provider, { value: value, children: children });
}
/** Language picker for Lab chrome; lists only server-available locales. */
export function LabLanguageSwitcher({ className, iconOnly = false, }) {
    const { locale, setLocale, availableLocales, t, dir } = useLabI18n();
    const trigger = useRef(null);
    const [portalContainer, setPortalContainer] = useState();
    const visible = LAB_LANGUAGES.filter((l) => availableLocales.includes(l.code));
    if (visible.length < 2)
        return null;
    if (iconOnly)
        return (_jsxs(DropdownMenu.Root, { modal: false, dir: dir, onOpenChange: (open) => {
                if (open)
                    setPortalContainer(trigger.current?.closest('dialog') || undefined);
            }, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx(LabButton, { ref: trigger, className: className, variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.common.language'), title: visible.find((language) => language.code === locale)?.name, children: _jsx(Globe, { size: 20 }) }) }), _jsx(DropdownMenu.Portal, { container: portalContainer, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(DropdownMenu.Content, { className: "lab-actions-menu", "aria-label": t('lab.common.language'), side: "top", align: "end", sideOffset: 8, collisionPadding: 12, "data-lab-corners": true, children: _jsx(DropdownMenu.RadioGroup, { value: locale, onValueChange: setLocale, children: visible.map((language) => (_jsxs(DropdownMenu.RadioItem, { value: language.code, className: "lab-actions-menu__item", children: [_jsx("span", { className: "lab-actions-menu__leading", children: _jsx(DropdownMenu.ItemIndicator, { children: _jsx(Check, { size: 16 }) }) }), _jsx("span", { lang: language.code, dir: language.dir, children: language.name })] }, language.code))) }) }) }) })] }));
    return (_jsxs("span", { className: className, style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [_jsx(Globe, { size: 16, "aria-hidden": "true" }), _jsx(LabSelect, { hint: t('lab.common.language'), "aria-label": t('lab.common.language'), value: locale, onValueChange: (next) => setLocale(next), children: visible.map((language) => (_jsx(LabOption, { value: language.code, children: language.name }, language.code))) })] }));
}
//# sourceMappingURL=i18n.js.map