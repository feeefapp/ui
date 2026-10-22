import { IntlMessageFormat } from 'intl-messageformat';
/**
 * Pure i18n helpers (no React, no browser globals) so unit tests and the
 * standalone preview can exercise the exact code the provider runs.
 *
 * Hosts pass translations as a flat `{ "lab.…": "ICU string" }` map, with the
 * active locale already merged over their default locale.
 */
/** Built-in languages: code, native name and direction. The switcher shows them in this order. */
export const LAB_LANGUAGES = [
    { code: 'ar', name: 'العربية', dir: 'rtl' },
    { code: 'fr', name: 'Français', dir: 'ltr' },
    { code: 'en', name: 'English', dir: 'ltr' },
];
const RTL_BASES = new Set(['ar', 'fa', 'he', 'ur']);
/** `rtl` for Arabic, Persian, Hebrew and Urdu (any region subtag), otherwise `ltr`. */
export function labDirectionFor(locale) {
    const base = String(locale || '').split(/[-_]/, 1)[0].toLowerCase();
    return RTL_BASES.has(base) ? 'rtl' : 'ltr';
}
/** Format one ICU message; falls back to the raw pattern on any error. */
export function formatLabMessage(message, locale, params) {
    if (!message.includes('{'))
        return message;
    try {
        return String(new IntlMessageFormat(message, locale).format(params ?? {}));
    }
    catch {
        return message;
    }
}
/**
 * Resolve `key` against a flat translations map. Returns the key itself when
 * unknown, mirroring the server and the global React `LanguageProvider`.
 */
export function translateLab(translations, locale, key, params) {
    const message = translations[key];
    if (message === undefined)
        return key;
    return formatLabMessage(message, locale, params);
}
/** Flatten nested lab JSON (`{voice:{title:"…"}}`) into `lab.voice.title` keys. */
export function flattenLabTranslations(nested, prefix = 'lab') {
    const out = {};
    const walk = (value, path) => {
        if (typeof value === 'string')
            out[path] = value;
        else if (value && typeof value === 'object' && !Array.isArray(value))
            for (const [k, v] of Object.entries(value))
                walk(v, `${path}.${k}`);
    };
    walk(nested, prefix);
    return out;
}
//# sourceMappingURL=i18n-core.js.map