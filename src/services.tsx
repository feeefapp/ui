'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

/**
 * Key/value storage for small UI preferences (the kit stores the theme mode under
 * `feeef-lab-theme`). The browser default uses `localStorage` and never throws.
 */
export interface Preferences {
  /** Returns the stored string, or `null` when the key is missing or storage is unavailable. */
  get(key: string): string | null
  /** Stores a string. Failures are swallowed; the current session keeps working. */
  set(key: string, value: string): void
  /** Deletes a key. */
  remove(key: string): void
}
/**
 * Platform ports: every browser or router dependency a kit widget needs. Widgets call these
 * through `useServices()` instead of touching `window`, `localStorage` or the clipboard, so
 * hosts can swap them for a client-side router, a native shell or test doubles.
 */
export interface Services {
  /** Small persistent preferences, such as the theme mode. Default: `localStorage`. */
  preferences: Preferences
  /** Opens a URL, e.g. after a language change. Default: `window.location.assign`. */
  navigate(url: string): void
  /** Writes text to the clipboard. Default: `navigator.clipboard.writeText`; rejects when unavailable. */
  copyText(text: string): Promise<void>
  /** Reads clipboard items (images, text). Default: `navigator.clipboard.read`; rejects when unavailable. */
  readClipboard(): Promise<ClipboardItem[]>
  /** Saves `content` as a file named `filename` with the given media type. Default: a Blob download link. */
  downloadText(filename: string, content: string, mediaType: string): void
}
/** Browser implementations used for any service the host does not supply. */
const browserServices: Services = {
  navigate(url) {
    window.location.assign(url)
  },
  downloadText(filename, content, mediaType) {
    const url = URL.createObjectURL(new Blob([content], { type: mediaType }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  async readClipboard() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read)
      throw new Error('Clipboard unavailable')
    return navigator.clipboard.read()
  },
  preferences: {
    get(key) {
      try {
        return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
      } catch {
        return null
      }
    },
    remove(key) {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key)
      } catch {}
    },
    set(key, value) {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
      } catch {
        /* Storage can be unavailable; the current session still works. */
      }
    },
  },
  async copyText(text) {
    if (typeof navigator === 'undefined' || !navigator.clipboard)
      throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(text)
  },
}
const ServicesContext = createContext<Services>(browserServices)
/**
 * Installs services for its subtree. Pass only the ports you override; the rest keep their
 * browser defaults. `Provider` renders this for you from its `services` prop.
 */
export function ServicesProvider({
  children,
  services,
}: {
  children: ReactNode
  /** Services to override. Keep the object stable (memoize it) to avoid re-rendering consumers. */
  services?: Partial<Services>
}) {
  const value = useMemo(() => ({ ...browserServices, ...services }), [services])
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}
/** Returns the nearest services, or the browser defaults when no provider is mounted. */
export const useServices = () => useContext(ServicesContext)
