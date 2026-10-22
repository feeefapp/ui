'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { LabSwap } from './motion'
import { LabButton } from './ui'
import './theme.css'
import './system.css'
import { installFoContinuousCorners } from './brand/corners'
import { useLabServices } from './services'
import { useLabI18n } from './i18n'
import { applyLabThemeConfig, type LabThemeConfig } from './theme-config'
/** Color mode. `system` follows `prefers-color-scheme` and updates when it changes. */
export type LabThemeMode = 'system' | 'light' | 'dark'
type Mode = LabThemeMode
const Context = createContext<{
  mode: Mode
  resolvedMode: 'light' | 'dark'
  setMode: (mode: Mode) => void
} | null>(null)
const layoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
/**
 * Owns the color mode and the app theme config. Sets `data-lab-theme="light|dark"` on `<html>`
 * (every color token hangs off it), applies `config` with `applyLabThemeConfig`, and stores
 * the chosen mode in the `preferences` service under `feeef-lab-theme`.
 * `LabProvider` renders this for you.
 */
export function LabThemeProvider({
  children,
  initialMode = 'system',
  enableCornerFallback = false,
  config,
}: {
  children: ReactNode
  /** Mode used when no preference is stored yet. Default: `system`. */
  initialMode?: Mode
  /** Start the SVG superellipse fallback on browsers without `corner-shape` support. */
  enableCornerFallback?: boolean
  /** App-level palette, density and radius (theme-config.ts). */
  config?: LabThemeConfig
}) {
  const { preferences } = useLabServices()
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return initialMode
    try {
      const saved = preferences.get('feeef-lab-theme')
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : initialMode
    } catch {
      return initialMode
    }
  })
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(
    initialMode === 'dark' ? 'dark' : 'light'
  )
  useEffect(() => {
    if (enableCornerFallback) return installFoContinuousCorners()
  }, [enableCornerFallback])
  const { palette, density, radius, primary } = config ?? {}
  layoutEffect(() => {
    applyLabThemeConfig(document.documentElement, { palette, density, radius, primary })
  }, [palette, density, radius, primary])
  layoutEffect(() => {
    const root = document.documentElement,
      previous = root.getAttribute('data-lab-theme'),
      preference = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = mode === 'system' ? (preference.matches ? 'dark' : 'light') : mode
      root.setAttribute('data-lab-theme', resolved)
      setResolvedMode(resolved)
    }
    apply()
    preference.addEventListener('change', apply)
    try {
      preferences.set('feeef-lab-theme', mode)
    } catch {}
    return () => {
      preference.removeEventListener('change', apply)
      if (previous === null) root.removeAttribute('data-lab-theme')
      else root.setAttribute('data-lab-theme', previous)
    }
  }, [mode, preferences])
  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
/**
 * Current mode (`system|light|dark`), the resolved `light|dark` and `setMode`.
 * Throws outside `LabProvider` / `LabThemeProvider`.
 */
export function useLabTheme() {
  const context = useContext(Context)
  if (!context) throw new Error('useLabTheme requires LabProvider or LabThemeProvider')
  return context
}
/** Icon button that cycles system → light → dark → system. Its label comes from `lab.common.theme*`. */
export function LabThemeSwitch() {
  const { t } = useLabI18n()
  const context = useLabTheme()
  const next: Mode =
    context.mode === 'system' ? 'light' : context.mode === 'light' ? 'dark' : 'system'
  const Icon = context.mode === 'system' ? Monitor : context.mode === 'dark' ? Moon : Sun
  return (
    <LabButton
      className="lab-theme-switch"
      variant="ghost"
      appearance="toolbar"
      controlSize="icon"
      aria-label={t('lab.common.themeSwitchTo', { mode: context.mode, next })}
      title={t('lab.common.theme', { mode: context.mode })}
      onClick={() => context.setMode(next)}
    >
      <LabSwap swapKey={context.mode}>
        <Icon size={20} />
      </LabSwap>
    </LabButton>
  )
}
