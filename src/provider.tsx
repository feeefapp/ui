import type { ReactNode } from 'react'
import { LabServicesProvider, type LabServices } from './services'
import { LabThemeProvider, type LabThemeMode } from './theme'
import type { LabThemeConfig } from './theme-config'
import { LabScaffoldProvider } from './scaffold'
import { LabI18nProvider, type LabI18nSource } from './i18n'
import { FO_FONTS_CSS } from './brand/fonts'
import './workspace.css'

/** Composition root: install context once and keep leaf widgets independent. */
export function LabProvider({
  children,
  services,
  i18n,
  initialTheme = 'system',
  enableCornerFallback = false,
  theme,
}: {
  children: ReactNode
  services?: Partial<LabServices>
  /** Locale, direction, translations and URL from the host app. */
  i18n?: LabI18nSource
  initialTheme?: LabThemeMode
  /** Opt in to SVG corners only on browsers without native corner-shape support. */
  enableCornerFallback?: boolean
  /** App-level look: palette, density, radius. See theme-config.ts. */
  theme?: LabThemeConfig
}) {
  return (
    <LabServicesProvider services={services}>
      <LabI18nProvider {...i18n}>
        <LabThemeProvider
          initialMode={initialTheme}
          enableCornerFallback={enableCornerFallback}
          config={theme}
        >
          <LabScaffoldProvider>
            <style>{FO_FONTS_CSS}</style>
            {children}
          </LabScaffoldProvider>
        </LabThemeProvider>
      </LabI18nProvider>
    </LabServicesProvider>
  )
}
