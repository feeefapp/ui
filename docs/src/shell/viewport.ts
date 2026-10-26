import { createContext, useContext, type RefObject } from 'react'

/** The scaffold's content scroll viewport: pages scroll inside it, not the window. */
export const ViewportContext = createContext<RefObject<HTMLDivElement | null>>({ current: null })

export const useViewport = () => useContext(ViewportContext)
