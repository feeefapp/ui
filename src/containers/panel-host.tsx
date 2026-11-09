'use client'

import * as React from 'react'
import { InPlaceSheet } from './sheet'
import { useElementWidth } from './adaptive'
import { allocatePanelWidths, closePanel, pushPanel, replacePanel, type PanelSizing } from './panel-model'
import type { PresentationChromeProps } from '../presentation/modal'
import { cn } from '../utils'
import { useShellGap } from '../scroll/shell-gap'
import './panel.css'

/** An independent work surface. Header tools and close always belong to this panel. */
export type PanelProps = PresentationChromeProps & {
  /** Scrollable content. It is mounted once for this panel's stable identity. */
  children: React.ReactNode
  /** Content inset in CSS pixels; defaults to the shared presentation body inset. */
  contentPadding?: number
  /** Standalone close action; a PanelHost supplies its own guarded close action. */
  onClose?: () => void
  /** Class on the content surface, not the host column. */
  className?: string
}

/** A stable work identity plus its independent surface and desktop sizing preferences. */
export type PanelEntry = PanelSizing & {
  /** Unique within the host. Keep unchanged while updating the same work; change to reset it. */
  id: string
  /** One Panel element, including its own title, tools and body. */
  panel: React.ReactElement<PanelProps>
}

/** Why descendants would be discarded. */
export type PanelChangeReason = 'push' | 'replace' | 'close'
/** Navigation requests coordinated by one host. All operations are controlled. */
export type PanelStackState = {
  /** Current controlled array, including the root at index zero. */
  panels: readonly PanelEntry[]
  /** Whether a close guard is pending; duplicate requests are ignored. */
  pending: boolean
  /** Append, or truncate descendants after an ancestor before appending. */
  push: (panel: PanelEntry, after?: string) => Promise<boolean>
  /** Replace a panel (last by default), truncating descendants. */
  replace: (panel: PanelEntry, id?: string) => Promise<boolean>
  /** Close a panel and descendants. The root cannot be closed. */
  close: (id: string) => Promise<boolean>
}

const StackContext = React.createContext<PanelStackState | null>(null)
const SurfaceContext = React.createContext<{ sheet: boolean; hidden: boolean; close?: () => void } | null>(null)
/** Access the nearest host's controlled navigation requests. Not business or routing state. */
export function usePanelStack(): PanelStackState {
  const value = React.useContext(StackContext)
  if (!value) throw new Error('usePanelStack requires a PanelHost')
  return value
}

/** Opaque, bounded scrolling surface; inside a host its very same Sheet tree becomes a column. */
export function Panel({ onClose, ...props }: PanelProps) {
  const surface = React.useContext(SurfaceContext)
  const close = surface ? surface.close : onClose
  return <InPlaceSheet {...props} open onOpenChange={() => close?.()} showClose={!!close && props.showClose !== false}
    regular="sheet" recede={false} detents={['large']} grabber={false}
    inPlace={{ sheet: surface?.sheet ?? false, hidden: surface?.hidden }} />
}

export type PanelHostProps = {
  /** Controlled chain, root first. Stable unique IDs preserve drafts and scroll while resizing. */
  panels: readonly PanelEntry[]
  /** Echo the requested chain into panels. The host never keeps a shadow navigation stack. */
  onPanelsChange: (panels: readonly PanelEntry[]) => void
  /** Container width below which details become native, stacked modal Sheets. Default 720. */
  breakpoint?: number
  /** Optional column gap in CSS pixels. Default: the theme's --lab-shell-gap. */
  gap?: number
  /** Approve discarding these entries, deepest first. False cancels; may await confirmation. */
  beforeClose?: (panels: readonly PanelEntry[], reason: PanelChangeReason) => boolean | Promise<boolean>
  /** Reports a rejected guard. Keep confirmation/error UX in the owner; the stack is unchanged. */
  onCloseError?: (error: unknown) => void
  /** Class on the bounded, measured workspace. */
  className?: string
  /** Layout styles; the host must receive bounded height from its parent. */
  style?: React.CSSProperties
}

/**
 * One coordinator for any depth: newest fitting desktop columns, stacked compact Sheets.
 * All entries stay mounted under identical parents. Only explicit removal resets child state.
 * Native dialog top-layer promotion changes presentation without a portal or second content copy.
 */
export function PanelHost({ panels, onPanelsChange, breakpoint = 720, gap, beforeClose, onCloseError, className, style }: PanelHostProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const width = useElementWidth(root)
  const themeGap = useShellGap(root)
  const [pending, setPending] = React.useState(false)
  const busy = React.useRef(false)
  const latest = React.useRef(panels)
  latest.current = panels
  const request = async (next: readonly PanelEntry[], reason: PanelChangeReason) => {
    if (busy.current) return false
    const snapshot = panels
    const removed = snapshot.filter(p => !next.some(n => n.id === p.id)).reverse()
    if (removed.length && beforeClose) {
      busy.current = true
      setPending(true)
      try {
        if (!await beforeClose(removed, reason) || latest.current !== snapshot) return false
      } catch (error) {
        onCloseError?.(error)
        return false
      } finally {
        busy.current = false
        setPending(false)
      }
    }
    onPanelsChange(next)
    return true
  }
  const stack: PanelStackState = {
    panels, pending,
    push: (panel, after) => request(pushPanel(panels, panel, after), 'push'),
    replace: (panel, id) => request(replacePanel(panels, panel, id), 'replace'),
    close: id => id === panels[0]?.id || !panels.some(p => p.id === id)
      ? Promise.resolve(false) : request(closePanel(panels, id), 'close'),
  }
  const compact = width !== null && width < breakpoint
  const columns = allocatePanelWidths(panels, width ?? 0, gap ?? themeGap)
  const widths = new Map(columns.map(p => [p.id, p.width]))
  return (
    <StackContext.Provider value={stack}>
      <div ref={root} className={cn('lab-panel-host', className)} style={{ ...style, ...(gap === undefined ? {} : { gap }) }}
        data-compact={compact || undefined} aria-busy={pending || undefined}>
        {panels.map((entry, index) => {
          const sheet = compact && index > 0
          const hidden = !compact && width !== null && !widths.has(entry.id)
          return <div key={entry.id} className="lab-panel-slot" hidden={hidden} inert={hidden || undefined}
            data-sheet={sheet || undefined} data-panel-id={entry.id}
            style={{ width: compact ? '100%' : widths.get(entry.id) ?? 0 }}>
            <SurfaceContext.Provider value={{ sheet, hidden, close: index === 0 ? undefined : () => { void stack.close(entry.id) } }}>
              {entry.panel}
            </SurfaceContext.Provider>
          </div>
        })}
      </div>
    </StackContext.Provider>
  )
}

/** Alias for PanelHost when naming the complete controlled chain rather than its layout role. */
export const PanelStack = PanelHost
