import type { ReactNode } from 'react'
import { ServicesProvider, type Services } from './services'
import { ThemeProvider, type ThemeMode } from './theme'
import type { ThemeConfig } from './theme-config'
import { ScaffoldProvider } from './scaffold'
import { I18nProvider, type I18nSource } from './i18n'
import { FO_FONTS_CSS } from './brand/fonts'
import './workspace.css'

/**
 * Composition root: install context once and keep leaf widgets independent.
 * Renders services → i18n → theme → scaffold (floating layers) and loads the brand fonts.
 * Mount it once around the whole app.
 */
export function Provider({
  children,
  services,
  i18n,
  initialTheme = 'system',
  enableCornerFallback = false,
  theme,
}: {
  children: ReactNode
  /** Platform ports to override (navigate, preferences, clipboard, downloads). */
  services?: Partial<Services>
  /** Locale, direction, translations and URL from the host app. */
  i18n?: I18nSource
  /** Color mode used until the reader picks one. Default: `system`. */
  initialTheme?: ThemeMode
  /** Opt in to SVG corners only on browsers without native corner-shape support. */
  enableCornerFallback?: boolean
  /** App-level look: palette, density, radius. See theme-config.ts. */
  theme?: ThemeConfig
}) {
  return (
    <ServicesProvider services={services}>
      <I18nProvider {...i18n}>
        <ThemeProvider
          initialMode={initialTheme}
          enableCornerFallback={enableCornerFallback}
          config={theme}
        >
          <ScaffoldProvider>
            <style>{FO_FONTS_CSS}</style>
            {children}
          </ScaffoldProvider>
        </ThemeProvider>
      </I18nProvider>
    </ServicesProvider>
  )
}
