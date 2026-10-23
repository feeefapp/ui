'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IntlMessageFormat } from 'intl-messageformat'
import { Check, Globe } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button, Select, Option } from './ui'
import './actions/actions.css'
import { MenuSurface } from './menu/menu-surface'
import { useFloatingBoundary } from './menu/boundary'
import { LANGUAGES, directionFor } from './i18n-core'
import { UI_MESSAGES } from './messages'
import { useServices } from './services'

/** What the host app passes to `Provider i18n={…}` (or `I18nProvider`). */
export interface I18nSource {
  /** Active locale code, e.g. `en`, `ar`, `fr`. Default: `ar`. */
  locale?: string
  /** Text direction. Default: derived from `locale` (`rtl` for ar, fa, he, ur). */
  dir?: 'rtl' | 'ltr'
  /** Locales the language switcher offers. Default: every built-in language (ar, fr, en). */
  availableLocales?: readonly string[]
  /** Flat `{ "lab.…": "ICU message" }` map; merged over the kit's built-in strings for `locale`. */
  translations?: Record<string, string>
  /** Current path + query. Defaults to `window.location`. */
  url?: string
  /** Opens a URL after a language change. Defaults to the `navigate` service. */
  navigate?: (url: string) => void
}

/** The value of `useI18n()`. */
export interface I18n {
  /** Active locale code. */
  locale: string
  /** Active text direction. */
  dir: 'rtl' | 'ltr'
  /** Locales the host serves. */
  availableLocales: readonly string[]
  /** Translates `key` with ICU `params`; returns the key itself when no string exists. */
  t: (key: string, params?: Record<string, string | number | Date>) => string
  /** Navigates to the current URL with `?hl=<locale>`. Ignores unknown or current locales. */
  setLocale: (locale: string) => void
}

const FALLBACK_LOCALE = 'ar'
/** Stable default so the context value is not rebuilt on every render. */
const DEFAULT_LOCALES: readonly string[] = LANGUAGES.map((l) => l.code)

const I18nContext = createContext<I18n>({
  locale: FALLBACK_LOCALE,
  dir: 'rtl',
  availableLocales: DEFAULT_LOCALES,
  t: (key) => key,
  setLocale: () => {},
})

/** Locale, direction and `t()` for the nearest `I18nProvider` (Arabic, RTL, keys as text without one). */
export const useI18n = () => useContext(I18nContext)

/** Append/replace `?hl=<code>` on a path+query URL (mirrors the global provider). */
export function localeUrl(currentUrl: string, code: string): string {
  try {
    const url = new URL(currentUrl, 'http://localhost')
    url.searchParams.set('hl', code)
    return url.pathname + (url.search || '') + url.hash
  } catch {
    return `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}hl=${encodeURIComponent(code)}`
  }
}

function makeFormatter(locale: string) {
  const cache = new Map<string, IntlMessageFormat | null>()
  // Keyed by message, not key, so new translations for the same key are never served stale.
  return (message: string, params?: Record<string, unknown>): string => {
    let fmt = cache.get(message)
    if (fmt === undefined) {
      try {
        fmt = new IntlMessageFormat(message, locale)
      } catch {
        fmt = null
      }
      cache.set(message, fmt)
    }
    if (!fmt) return message
    try {
      return String(fmt.format(params ?? {}))
    } catch {
      return message
    }
  }
}

/**
 * Locale context. The host owns locale, direction and the flat translations
 * dictionary and passes them in; kit widgets fall back to their built-in
 * strings. Switching language opens the current URL with `?hl=<code>` so the
 * host can persist the choice server-side.
 */
export function I18nProvider({
  children,
  locale: localeProp,
  dir: dirProp,
  availableLocales: availableProp,
  translations: translationsProp,
  url,
  navigate: navigateProp,
}: I18nSource & { children: ReactNode }) {
  const services = useServices()
  const locale = localeProp ?? FALLBACK_LOCALE
  const dir: 'rtl' | 'ltr' = dirProp ?? directionFor(locale)
  const translations = useMemo(
    () => ({ ...(UI_MESSAGES[locale] ?? UI_MESSAGES.en), ...translationsProp }),
    [locale, translationsProp]
  )
  const availableLocales = availableProp ?? DEFAULT_LOCALES
  const navigate = navigateProp ?? services.navigate

  const formatterRef = useRef(makeFormatter(locale))
  const lastLocaleRef = useRef(locale)
  if (lastLocaleRef.current !== locale) {
    formatterRef.current = makeFormatter(locale)
    lastLocaleRef.current = locale
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  const value = useMemo<I18n>(() => {
    const format = formatterRef.current
    return {
      locale,
      dir,
      availableLocales,
      t: (key, params) => {
        const message = translations[key]
        if (message === undefined) return key
        if (!message.includes('{')) return message
        return format(message, (params ?? {}) as Record<string, unknown>)
      },
      setLocale: (code) => {
        if (!availableLocales.includes(code) || code === locale) return
        const current =
          url ||
          (typeof window !== 'undefined'
            ? window.location.pathname + window.location.search + window.location.hash
            : '/')
        navigate(localeUrl(current, code))
      },
    }
  }, [locale, dir, availableLocales, translations, url, navigate])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Language picker for Lab chrome; lists only server-available locales and renders nothing
 * when fewer than two are available. Choosing one calls `setLocale`.
 */
export function LanguageSwitcher({
  className,
  iconOnly = false,
}: {
  className?: string
  /** Show a globe icon button with a menu instead of the labeled select. */
  iconOnly?: boolean
}) {
  const { locale, setLocale, availableLocales, t, dir } = useI18n()
  const trigger = useRef<HTMLButtonElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()
  const boundary = useFloatingBoundary()
  const visible = LANGUAGES.filter((l) => availableLocales.includes(l.code))
  if (visible.length < 2) return null
  if (iconOnly)
    return (
      <DropdownMenu.Root
        modal={false}
        dir={dir}
        onOpenChange={(open) => {
          if (open) setPortalContainer(trigger.current?.closest('dialog') || boundary || undefined)
        }}
      >
        <DropdownMenu.Trigger asChild>
          <Button
            ref={trigger}
            className={className}
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            aria-label={t('lab.common.language')}
            title={visible.find((language) => language.code === locale)?.name}
          >
            <Globe size={20} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={portalContainer}>
          <MenuSurface asChild>
            <DropdownMenu.Content className="lab-actions-menu" aria-label={t('lab.common.language')}>
              <DropdownMenu.RadioGroup value={locale} onValueChange={setLocale}>
                {visible.map((language) => (
                  <DropdownMenu.RadioItem
                    key={language.code}
                    value={language.code}
                    className="lab-actions-menu__item"
                  >
                    <span className="lab-actions-menu__leading">
                      <DropdownMenu.ItemIndicator>
                        <Check size={16} />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    <span lang={language.code} dir={language.dir}>
                      {language.name}
                    </span>
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </MenuSurface>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Globe size={16} aria-hidden="true" />
      <Select
        hint={t('lab.common.language')}
        aria-label={t('lab.common.language')}
        value={locale}
        onValueChange={(next) => setLocale(next)}
      >
        {visible.map((language) => (
          <Option key={language.code} value={language.code}>
            {language.name}
          </Option>
        ))}
      </Select>
    </span>
  )
}
