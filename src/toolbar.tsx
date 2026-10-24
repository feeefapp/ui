'use client'

import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './utils'
import { GlassGroup } from './scaffold'
import { GlassScope } from './glass/container'
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
    <GlassScope {...props} className={cn('lab-toolbar-layout', className)} role="group" aria-label={label}>
      <div className="lab-toolbar-leading">{leading}</div>
      {trailing && <div className="lab-toolbar-trailing">{trailing}</div>}
    </GlassScope>
  )
}

export type ToolbarOrientation = 'horizontal' | 'vertical'

/**
 * The orientation ToolbarGroups take when they don't set one. A collapsed sidebar (the scaffold's
 * rail) provides `vertical`, so its bottom groups stack their controls in a column that fits.
 */
export const ToolbarOrientationContext = createContext<ToolbarOrientation>('horizontal')

/**
 * One glass pill for related toolbar controls (`role="group"`). Children use
 * `appearance="toolbar"` and the default `regular` size, which the group sets to fill its
 * `--lab-toolbar-item` bubble (44px comfortable, controls 38px; the bubble is at least 44px on touch).
 */
export const ToolbarGroup = forwardRef<HTMLElement, Omit<ComponentPropsWithoutRef<typeof GlassGroup>, 'as'> & {
  /** Accessible name of the group. */
  label: string
  /** Lay the controls out in a row or a column. Default: the surrounding ToolbarOrientationContext. */
  orientation?: ToolbarOrientation
}>(function ToolbarGroup({ label, orientation, className, ...props }, ref) {
  const inherited = useContext(ToolbarOrientationContext)
  return (
    <GlassGroup
      {...props}
      ref={ref}
      className={cn('lab-toolbar-group', className)}
      role="group"
      aria-label={label}
      data-orientation={orientation ?? inherited}
    />
  )
})
