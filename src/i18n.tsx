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

export interface LabI18nSource {
  locale?: string
  dir?: 'rtl' | 'ltr'
  availableLocales?: readonly string[]
  translations?: Record<string, string>
  /** Current path + query. Defaults to `window.location`. */
  url?: string
  /** Opens a URL after a language change. Defaults to the `navigate` service. */
  navigate?: (url: string) => void
}

export interface LabI18n {
  locale: string
  dir: 'rtl' | 'ltr'
  availableLocales: readonly string[]
  t: (key: string, params?: Record<string, string | number | Date>) => string
  setLocale: (locale: string) => void
}

const FALLBACK_LOCALE = 'ar'

const LabI18nContext = createContext<LabI18n>({
  locale: FALLBACK_LOCALE,
  dir: 'rtl',
  availableLocales: LAB_LANGUAGES.map((l) => l.code),
  t: (key) => key,
  setLocale: () => {},
})

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
  return (message: string, key: string, params?: Record<string, unknown>): string => {
    let fmt = cache.get(key)
    if (fmt === undefined) {
      try {
        fmt = new IntlMessageFormat(message, locale)
      } catch {
        fmt = null
      }
      cache.set(key, fmt)
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
  const availableLocales = availableProp ?? LAB_LANGUAGES.map((l) => l.code)
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
        return format(message, key, (params ?? {}) as Record<string, unknown>)
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

/** Language picker for Lab chrome; lists only server-available locales. */
export function LabLanguageSwitcher({
  className,
  iconOnly = false,
}: {
  className?: string
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
