'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

/** Platform ports: inject storage and clipboard without coupling widgets to browser globals. */
export interface LabPreferences {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}
export interface LabServices {
  preferences: LabPreferences
  navigate(url: string): void
  copyText(text: string): Promise<void>
  readClipboard(): Promise<ClipboardItem[]>
  downloadText(filename: string, content: string, mediaType: string): void
}
const browserServices: LabServices = {
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
const LabServicesContext = createContext<LabServices>(browserServices)
export function LabServicesProvider({
  children,
  services,
}: {
  children: ReactNode
  services?: Partial<LabServices>
}) {
  const value = useMemo(() => ({ ...browserServices, ...services }), [services])
  return <LabServicesContext.Provider value={value}>{children}</LabServicesContext.Provider>
}
export const useLabServices = () => useContext(LabServicesContext)
