import { IntlMessageFormat } from 'intl-messageformat'
import { UI_MESSAGES } from './messages'

/**
 * Pure i18n helpers (no React, no browser globals) so unit tests and the
 * standalone preview can exercise the exact code the provider runs.
 *
 * Hosts pass translations as a flat `{ "lab.…": "ICU string" }` map, with the
 * active locale already merged over their default locale.
 */
/** Built-in languages: code, native name and direction. The switcher shows them in this order. */
export const LANGUAGES = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
] as const

/** `ar`, `fr` or `en`. */
export type LanguageCode = (typeof LANGUAGES)[number]['code']

const RTL_BASES = new Set(['ar', 'fa', 'he', 'ur'])

/** `rtl` for Arabic, Persian, Hebrew and Urdu (any region subtag), otherwise `ltr`. */
export function directionFor(locale: string): 'rtl' | 'ltr' {
  const base = String(locale || '').split(/[-_]/, 1)[0]!.toLowerCase()
  return RTL_BASES.has(base) ? 'rtl' : 'ltr'
}

/** Format one ICU message; falls back to the raw pattern on any error. */
export function formatMessage(
  message: string,
  locale: string,
  params?: Record<string, string | number | Date>
): string {
  if (!message.includes('{')) return message
  try {
    return String(new IntlMessageFormat(message, locale).format(params ?? {}))
  } catch {
    return message
  }
}

/**
 * Resolve `key` against a flat translations map. Returns the key itself when
 * unknown, mirroring the server and the global React `LanguageProvider`.
 */
export function translateLab(
  translations: Record<string, string>,
  locale: string,
  key: string,
  params?: Record<string, string | number | Date>
): string {
  const message = translations[key]
  if (message === undefined) return key
  return formatMessage(message, locale, params)
}

/** A `t()` function: the `useI18n().t` of a component, or `englishText` outside React. */
export type Translate = (key: string, params?: Record<string, string | number | Date>) => string

/**
 * The kit's built-in English strings, for pure helpers called without a translator (tests, server
 * code). Kit widgets pass `useI18n().t` instead, so the reader's language wins.
 */
export const englishText: Translate = (key, params) => translateLab(UI_MESSAGES.en!, 'en', key, params)

/** Flatten nested lab JSON (`{voice:{title:"…"}}`) into `lab.voice.title` keys. */
export function flattenTranslations(
  nested: Record<string, unknown>,
  prefix = 'lab'
): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') out[path] = value
    else if (value && typeof value === 'object' && !Array.isArray(value))
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`)
  }
  walk(nested, prefix)
  return out
}
