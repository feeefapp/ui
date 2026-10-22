'use client'

import { forwardRef, useImperativeHandle, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../utils'
import { LabGlassGroup } from '../scaffold'
import { LabDockContentSwap } from './content-swap'
import './dock.css'
import { useDockSize } from './use_dock_size'
import { LabActionsWidthProvider } from '../actions/width-context'

export type LabDockProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'content'> & {
  /** Accessible name of the dock group. */
  label: string
  /** A compact title/status tile. It may shrink; actions remain accessible through overflow. */
  content?: ReactNode
  /** The actions: buttons or one LabActionsBar, which then overflows into a menu when narrow. */
  children: ReactNode
  /** Bottom task actions stay centered by default. Override only for contextual chrome. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Use task identity, e.g. idle/selected; don't key every count or label change. */
  swapKey?: string
}

/**
 * Floating glass container for a status tile and its actions. It hugs its content up to the host's
 * width and animates size changes; positioning and scroll reservations belong to its host.
 */
export const LabDock = forwardRef<HTMLElement, LabDockProps>(function LabDock(
  { label, content, children, align = 'center', swapKey = 'default', className, ...props },
  ref
) {
  const measured = useDockSize()
  useImperativeHandle(ref, () => measured.surface.current!, [])
  return (
    <div ref={measured.host} className={cn('lab-dock-host', `lab-dock-host--${align}`)}>
      <LabGlassGroup
        {...props}
        ref={measured.surface}
        style={{ ...props.style, ...measured.shellStyle }}
        className={cn('lab-dock', className)}
        role={props.role ?? 'group'}
        aria-label={label}
        tabIndex={-1}
        data-lab-dock
      >
        <div ref={measured.body} className="lab-dock-body" style={measured.bodyStyle}>
          <LabActionsWidthProvider value={measured.actionsMaxWidth}>
            <LabDockContentSwap swapKey={swapKey}>
              <div className="lab-dock-row">
                {content && <div className="lab-dock-content">{content}</div>}
                <div className="lab-dock-actions">{children}</div>
              </div>
            </LabDockContentSwap>
          </LabActionsWidthProvider>
        </div>
      </LabGlassGroup>
    </div>
  )
})
