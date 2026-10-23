import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeConfig } from '@feeef.dev/ui/theme-config'
import { THEME_DEFAULTS } from '@feeef.dev/ui/theme-config'
import { directionFor } from '@feeef.dev/ui/i18n-core'

/**
 * What the docs reader can change: the kit's own theme config, plus the demo language. The docs
 * text stays English and left-to-right; demo stages take the language's direction.
 */
export interface DocsSettings {
  locale: 'en' | 'ar' | 'fr'
  /** Which kit the example code shows: the React kit or its Flutter twin. */
  code: 'react' | 'flutter'
  theme: typeof THEME_DEFAULTS & { primary?: string }
}

type SettingsPatch = { locale?: DocsSettings['locale']; code?: DocsSettings['code']; theme?: ThemeConfig }

const DEFAULTS: DocsSettings = { locale: 'en', code: 'react', theme: { ...THEME_DEFAULTS } }
const KEY = 'feeef-ui-docs-settings'
const GLASS_SETTINGS_VERSION = 1

/** `?platform=flutter|react` opens the docs on that kit (shareable links). */
function platformFromUrl(): DocsSettings['code'] | null {
  if (typeof location === 'undefined') return null
  const value = new URLSearchParams(location.search).get('platform')
  return value === 'flutter' || value === 'react' ? value : null
}

/** A stored theme, keeping only today's options with valid values (older saves had other keys). */
function savedTheme(saved: unknown): DocsSettings['theme'] {
  const theme: DocsSettings['theme'] = { ...DEFAULTS.theme }
  if (!saved || typeof saved !== 'object') return theme
  const value = saved as Record<string, unknown>
  for (const key of Object.keys(DEFAULTS.theme) as (keyof typeof DEFAULTS.theme)[])
    if (typeof value[key] === typeof DEFAULTS.theme[key]) (theme as Record<string, unknown>)[key] = value[key]
  if (!['liquid', 'still', 'solid'].includes(theme.glass)) theme.glass = DEFAULTS.theme.glass
  if (typeof value.primary === 'string') theme.primary = value.primary
  return theme
}

function read(): DocsSettings {
  const platform = platformFromUrl()
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && typeof saved === 'object')
      return {
        locale: saved.locale ?? 'en',
        code: platform ?? (saved.code === 'flutter' ? 'flutter' : 'react'),
        theme: savedTheme(saved.glassSettingsVersion === GLASS_SETTINGS_VERSION ? saved.theme : { ...saved.theme, glassTint: 0 }),
      }
  } catch {}
  return platform ? { ...DEFAULTS, code: platform } : DEFAULTS
}

const Context = createContext<{
  settings: DocsSettings
  dir: 'ltr' | 'rtl'
  update: (patch: SettingsPatch) => void
  reset: () => void
} | null>(null)

export function DocsSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(read)
  const dir = directionFor(settings.locale)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...settings, glassSettingsVersion: GLASS_SETTINGS_VERSION }))
    } catch {}
  }, [settings])
  const value = useMemo(
    () => ({
      settings,
      dir,
      update: (patch: SettingsPatch) =>
        setSettings((s) => ({ ...s, ...patch, theme: { ...s.theme, ...patch.theme } })),
      // The platform is a reading choice, not a demo setting: reset keeps it.
      reset: () => setSettings((s) => ({ ...DEFAULTS, code: s.code })),
    }),
    [settings, dir]
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useDocsSettings() {
  const context = useContext(Context)
  if (!context) throw new Error('useDocsSettings requires DocsSettingsProvider')
  return context
}
