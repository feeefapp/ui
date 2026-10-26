/**
 * Pure i18n helpers (no React, no browser globals) so unit tests and the
 * standalone preview can exercise the exact code the provider runs.
 *
 * Hosts pass translations as a flat `{ "lab.…": "ICU string" }` map, with the
 * active locale already merged over their default locale.
 */
/** Built-in languages: code, native name and direction. The switcher shows them in this order. */
export declare const LANGUAGES: readonly [{
    readonly code: "ar";
    readonly name: "العربية";
    readonly dir: "rtl";
}, {
    readonly code: "fr";
    readonly name: "Français";
    readonly dir: "ltr";
}, {
    readonly code: "en";
    readonly name: "English";
    readonly dir: "ltr";
}];
/** `ar`, `fr` or `en`. */
export type LanguageCode = (typeof LANGUAGES)[number]['code'];
/** `rtl` for Arabic, Persian, Hebrew and Urdu (any region subtag), otherwise `ltr`. */
export declare function directionFor(locale: string): 'rtl' | 'ltr';
/** Format one ICU message; falls back to the raw pattern on any error. */
export declare function formatMessage(message: string, locale: string, params?: Record<string, string | number | Date>): string;
/**
 * Resolve `key` against a flat translations map. Returns the key itself when
 * unknown, mirroring the server and the global React `LanguageProvider`.
 */
export declare function translateLab(translations: Record<string, string>, locale: string, key: string, params?: Record<string, string | number | Date>): string;
/** Flatten nested lab JSON (`{voice:{title:"…"}}`) into `lab.voice.title` keys. */
export declare function flattenTranslations(nested: Record<string, unknown>, prefix?: string): Record<string, string>;
//# sourceMappingURL=i18n-core.d.ts.map