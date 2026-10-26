'use client'

import * as React from 'react'
import { cn } from '../utils'

const BoundaryContext = React.createContext<HTMLElement | null>(null)

export type FloatingBoundaryProps = React.HTMLAttributes<HTMLDivElement>

/**
 * The bounds of an app that does not fill the window (a phone frame, an embedded preview, a
 * resizable pane). Menus, selects, popovers and tooltips opened inside it render inside it and
 * never cross its edges; outside one they stay inside the window. Renders a `div` (positioned, so
 * floating panels place themselves against it) that takes any div attribute.
 */
export const FloatingBoundary = React.forwardRef<HTMLDivElement, FloatingBoundaryProps>(
  ({ className, children, ...props }, ref) => {
    const [element, setElement] = React.useState<HTMLDivElement | null>(null)
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        setElement(node)
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )
    return (
      <div {...props} ref={setRefs} className={cn('lab-floating-boundary', className)} data-lab-boundary="">
        <BoundaryContext.Provider value={element}>{children}</BoundaryContext.Provider>
      </div>
    )
  }
)
FloatingBoundary.displayName = 'FloatingBoundary'

/**
 * Makes `element` the place floating panels render into, without adding a box: presentation
 * surfaces (modal, sheet, drawer, pane) wrap their content in it, so a menu, select or popover
 * opened inside a modal `<dialog>` joins it in the top layer instead of rendering behind it.
 */
export function FloatingPortalScope({ element, children }: { element: HTMLElement | null; children: React.ReactNode }) {
  return <BoundaryContext.Provider value={element}>{children}</BoundaryContext.Provider>
}

/**
 * The nearest `FloatingBoundary` (or presentation surface) element, or null when the app fills the window. Pass it as a
 * Radix `collisionBoundary` and as the portal `container` of anything that floats.
 */
export function useFloatingBoundary() {
  return React.useContext(BoundaryContext)
}
