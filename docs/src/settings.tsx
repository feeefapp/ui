import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LabThemeConfig } from '@feeef.dev/ui/theme-config'
import { LAB_THEME_DEFAULTS } from '@feeef.dev/ui/theme-config'
import { labDirectionFor } from '@feeef.dev/ui/i18n-core'

/**
 * What the docs reader can change: the kit's own theme config, plus the demo language. The docs
 * text stays English and left-to-right; demo stages take the language's direction.
 */
export interface DocsSettings {
  locale: 'en' | 'ar' | 'fr'
  theme: typeof LAB_THEME_DEFAULTS & { primary?: string }
}

type SettingsPatch = { locale?: DocsSettings['locale']; theme?: LabThemeConfig }

const DEFAULTS: DocsSettings = { locale: 'en', theme: { ...LAB_THEME_DEFAULTS } }
const KEY = 'feeef-ui-docs-settings'

function read(): DocsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && typeof saved === 'object')
      return { locale: saved.locale ?? 'en', theme: { ...DEFAULTS.theme, ...saved.theme } }
  } catch {}
  return DEFAULTS
}

const Context = createContext<{
  settings: DocsSettings
  dir: 'ltr' | 'rtl'
  update: (patch: SettingsPatch) => void
  reset: () => void
} | null>(null)

export function DocsSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(read)
  const dir = labDirectionFor(settings.locale)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])
  const value = useMemo(
    () => ({
      settings,
      dir,
      update: (patch: SettingsPatch) =>
        setSettings((s) => ({ ...s, ...patch, theme: { ...s.theme, ...patch.theme } })),
      reset: () => setSettings(DEFAULTS),
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
