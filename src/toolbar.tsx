import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'
import { LabGlassGroup } from './scaffold'
import './toolbar.css'

/** Unpainted layout; only related controls share a material. Normal Tab order is preserved. */
export function LabToolbar({
  label,
  leading,
  trailing,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  label: string
  leading: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div {...props} className={cn('lab-toolbar-layout', className)} role="group" aria-label={label}>
      <div className="lab-toolbar-leading">{leading}</div>
      {trailing && <div className="lab-toolbar-trailing">{trailing}</div>}
    </div>
  )
}

export function LabToolbarGroup({
  label,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { label: string }) {
  return (
    <LabGlassGroup
      {...props}
      className={cn('lab-toolbar-group', className)}
      role="group"
      aria-label={label}
    />
  )
}
