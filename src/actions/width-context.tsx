'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ActionsWidthContext = createContext<number | undefined>(undefined)

/**
 * Layout boundary supplied by a shrink-wrapping parent such as Dock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export function ActionsWidthProvider({
  value,
  children,
}: {
  /** Available width for the actions slot, in pixels. `undefined` lets each bar measure its own host. */
  value: number | undefined
  /** Content containing one or more `ActionsBar`s. */
  children: ReactNode
}) {
  return <ActionsWidthContext.Provider value={value}>{children}</ActionsWidthContext.Provider>
}

export function useActionsWidth() {
  return useContext(ActionsWidthContext)
}
