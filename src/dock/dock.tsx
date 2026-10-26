'use client'

import { forwardRef, useImperativeHandle, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../utils'
import { GlassGroup } from '../scaffold'
import { GlassScope } from '../glass/container'
import { DockContentSwap } from './content-swap'
import './dock.css'
import { useDockSize } from './use_dock_size'
import { ActionsWidthProvider } from '../actions/width-context'

export type DockProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'content'> & {
  /** Accessible name of the dock group. */
  label: string
  /** A compact title/status tile. It may shrink; actions remain accessible through overflow. */
  content?: ReactNode
  /** The actions: buttons or one ActionsBar, which then overflows into a menu when narrow. */
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
export const Dock = forwardRef<HTMLElement, DockProps>(function Dock(
  { label, content, children, align = 'center', swapKey = 'default', className, ...props },
  ref
) {
  const measured = useDockSize()
  useImperativeHandle(ref, () => measured.surface.current!, [])
  return (
    <GlassScope ref={measured.host} className={cn('lab-dock-host', `lab-dock-host--${align}`)}>
      <GlassGroup
        {...props}
        ref={measured.surface}
        style={{ ...props.style, ...measured.shellStyle }}
        className={cn('lab-dock', className)}
        glassMotion="follow"
        role={props.role ?? 'group'}
        aria-label={label}
        tabIndex={-1}
        data-lab-dock
      >
        <div ref={measured.body} className="lab-dock-body" style={measured.bodyStyle}>
          <ActionsWidthProvider value={measured.actionsMaxWidth}>
            <DockContentSwap swapKey={swapKey}>
              <div className="lab-dock-row">
                {content && <div className="lab-dock-content">{content}</div>}
                <div className="lab-dock-actions">{children}</div>
              </div>
            </DockContentSwap>
          </ActionsWidthProvider>
        </div>
      </GlassGroup>
    </GlassScope>
  )
})
