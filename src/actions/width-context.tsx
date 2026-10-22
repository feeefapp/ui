'use client'

import { createContext, useContext, type ReactNode } from 'react'

const LabActionsWidthContext = createContext<number | undefined>(undefined)

/**
 * Layout boundary supplied by a shrink-wrapping parent such as LabDock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export function LabActionsWidthProvider({
  value,
  children,
}: {
  /** Available width for the actions slot, in pixels. `undefined` lets each bar measure its own host. */
  value: number | undefined
  /** Content containing one or more `LabActionsBar`s. */
  children: ReactNode
}) {
  return <LabActionsWidthContext.Provider value={value}>{children}</LabActionsWidthContext.Provider>
}

export function useLabActionsWidth() {
  return useContext(LabActionsWidthContext)
}
