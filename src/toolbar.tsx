'use client'

import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './utils'
import { GlassGroup } from './scaffold'
import './toolbar.css'

/**
 * Unpainted toolbar row: `leading` at the start, `trailing` at the end, empty space between them
 * passes pointer input through to the content below. Only related controls share a material (put
 * them in ToolbarGroups). Normal Tab order is preserved.
 */
export function Toolbar({
  label,
  leading,
  trailing,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Accessible name of the toolbar group. */
  label: string
  /** Start content, usually one or more ToolbarGroups. It may shrink. */
  leading: ReactNode
  /** End content; keeps its size. */
  trailing?: ReactNode
}) {
  return (
    <div {...props} className={cn('lab-toolbar-layout', className)} role="group" aria-label={label}>
      <div className="lab-toolbar-leading">{leading}</div>
      {trailing && <div className="lab-toolbar-trailing">{trailing}</div>}
    </div>
  )
}

/**
 * One glass pill for related toolbar controls (`role="group"`). Children should use
 * `appearance="toolbar"` and `controlSize="compact"`; the group sizes them to 40px (44px on touch).
 */
export const ToolbarGroup = forwardRef<HTMLElement, Omit<ComponentPropsWithoutRef<typeof GlassGroup>, 'as'> & {
  /** Accessible name of the group. */
  label: string
}>(function ToolbarGroup({ label, className, ...props }, ref) {
  return <GlassGroup {...props} ref={ref} className={cn('lab-toolbar-group', className)} role="group" aria-label={label}/>
})
