'use client'

import { LabPopoverSurface } from './ui'
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
import { LabButton, LabSelect, LabOption } from './ui'
import './actions/actions.css'
import { LAB_LANGUAGES, labDirectionFor } from './i18n-core'
import { LAB_UI_MESSAGES } from './messages'
import { useLabServices } from './services'

/** What the host app passes to `LabProvider i18n={…}` (or `LabI18nProvider`). */
export interface LabI18nSource {
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

/** The value of `useLabI18n()`. */
export interface LabI18n {
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
const DEFAULT_LOCALES: readonly string[] = LAB_LANGUAGES.map((l) => l.code)

const LabI18nContext = createContext<LabI18n>({
  locale: FALLBACK_LOCALE,
  dir: 'rtl',
  availableLocales: DEFAULT_LOCALES,
  t: (key) => key,
  setLocale: () => {},
})

/** Locale, direction and `t()` for the nearest `LabI18nProvider` (Arabic, RTL, keys as text without one). */
export const useLabI18n = () => useContext(LabI18nContext)

/** Append/replace `?hl=<code>` on a path+query URL (mirrors the global provider). */
export function labLocaleUrl(currentUrl: string, code: string): string {
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
export function LabI18nProvider({
  children,
  locale: localeProp,
  dir: dirProp,
  availableLocales: availableProp,
  translations: translationsProp,
  url,
  navigate: navigateProp,
}: LabI18nSource & { children: ReactNode }) {
  const services = useLabServices()
  const locale = localeProp ?? FALLBACK_LOCALE
  const dir: 'rtl' | 'ltr' = dirProp ?? labDirectionFor(locale)
  const translations = useMemo(
    () => ({ ...(LAB_UI_MESSAGES[locale] ?? LAB_UI_MESSAGES.en), ...translationsProp }),
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

  const value = useMemo<LabI18n>(() => {
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
        navigate(labLocaleUrl(current, code))
      },
    }
  }, [locale, dir, availableLocales, translations, url, navigate])

  return <LabI18nContext.Provider value={value}>{children}</LabI18nContext.Provider>
}

/**
 * Language picker for Lab chrome; lists only server-available locales and renders nothing
 * when fewer than two are available. Choosing one calls `setLocale`.
 */
export function LabLanguageSwitcher({
  className,
  iconOnly = false,
}: {
  className?: string
  /** Show a globe icon button with a menu instead of the labeled select. */
  iconOnly?: boolean
}) {
  const { locale, setLocale, availableLocales, t, dir } = useLabI18n()
  const trigger = useRef<HTMLButtonElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()
  const visible = LAB_LANGUAGES.filter((l) => availableLocales.includes(l.code))
  if (visible.length < 2) return null
  if (iconOnly)
    return (
      <DropdownMenu.Root
        modal={false}
        dir={dir}
        onOpenChange={(open) => {
          if (open) setPortalContainer(trigger.current?.closest('dialog') || undefined)
        }}
      >
        <DropdownMenu.Trigger asChild>
          <LabButton
            ref={trigger}
            className={className}
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            aria-label={t('lab.common.language')}
            title={visible.find((language) => language.code === locale)?.name}
          >
            <Globe size={20} />
          </LabButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={portalContainer}>
          <LabPopoverSurface asChild>
            <DropdownMenu.Content
              className="lab-actions-menu"
              aria-label={t('lab.common.language')}
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              data-lab-corners
            >
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
          </LabPopoverSurface>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Globe size={16} aria-hidden="true" />
      <LabSelect
        hint={t('lab.common.language')}
        aria-label={t('lab.common.language')}
        value={locale}
        onValueChange={(next) => setLocale(next)}
      >
        {visible.map((language) => (
          <LabOption key={language.code} value={language.code}>
            {language.name}
          </LabOption>
        ))}
      </LabSelect>
    </span>
  )
}
