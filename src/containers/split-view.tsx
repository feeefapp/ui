'use client'

import * as React from 'react'
import { ResizeDivider } from './resize-divider'
import { useI18n } from '../i18n'
import { createResizeDrag } from './resize-drag'
import { NavigationStack } from './navigation-stack'
import { cn } from '../utils'
import './split-view.css'

export type SplitViewProps = {
  /** The list column: usually a NavigationPage with selectable rows. */
  list: React.ReactElement
  /**
   * The open item's pages, first page first, each keyed. Empty or null when nothing is selected.
   * Wide: they form the detail column's own stack. Narrow: they are pushed on top of the list.
   */
  detail?: React.ReactNode
  /** Shown in the detail column while nothing is selected (wide only). */
  placeholder?: React.ReactNode
  /** The person went back from the top detail page. Remove it (or clear the selection). */
  onBack: () => void
  /** Controlled list column width in px. */
  listWidth?: number
  /** Initial list column width when uncontrolled. Default 360. */
  defaultListWidth?: number
  /** Called on drag release or keyboard/reset changes; controlled owners must echo the requested width. */
  onListWidthChange?: (width: number) => void
  /** Narrowest list column. Default 280. */
  minListWidth?: number
  /** Widest list column. Default 520. */
  maxListWidth?: number
  /** Lets the divider be dragged or moved with the arrow keys. Default true. */
  resizable?: boolean
  /** Below this width (px) the split collapses into one navigation stack. Default 720. */
  compactBreakpoint?: number
  /** Accessible name of the split view. */
  label?: string
  className?: string
}

/** Collects keyed page elements from `detail` (an element, an array or a fragment). */
function detailPages(detail: React.ReactNode): React.ReactElement[] {
  const pages: React.ReactElement[] = []
  const walk = (node: React.ReactNode) =>
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return
      if (child.type === React.Fragment) walk((child.props as { children?: React.ReactNode }).children)
      else pages.push(child)
    })
  walk(detail)
  return pages
}

/**
 * A list beside its detail, like Mail on iPad: two columns with a resizable divider on wide
 * screens, collapsing into one navigation stack (list → detail, swipe back) on narrow ones. The
 * same pages render in both, so a phone and a desktop share one implementation.
 */
export function SplitView({
  list,
  detail,
  placeholder,
  onBack,
  listWidth: controlledWidth,
  defaultListWidth = 360,
  onListWidthChange,
  minListWidth = 280,
  maxListWidth = 520,
  resizable = true,
  compactBreakpoint = 720,
  label = 'List and detail',
  className,
}: SplitViewProps) {
  const { t } = useI18n()
  const root = React.useRef<HTMLDivElement>(null)
  const [hostWidth, setHostWidth] = React.useState<number | null>(null)
  const [localWidth, setLocalWidth] = React.useState(defaultListWidth)
  const width = controlledWidth ?? localWidth
  const pages = detailPages(detail)
  const compact = hostWidth !== null && hostWidth < compactBreakpoint

  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setHostWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const drag = React.useRef<ReturnType<typeof createResizeDrag> | null>(null)
  React.useLayoutEffect(() => () => {
    drag.current?.finish(true)
    drag.current = null
  }, [width, controlledWidth, hostWidth, compact, minListWidth, maxListWidth, resizable])

  const clamp = (next: number) => Math.max(minListWidth, Math.min(maxListWidth, next))
  const commit = (next: number) => {
    const clamped = clamp(next)
    if (controlledWidth === undefined) setLocalWidth(clamped)
    onListWidthChange?.(clamped)
  }
  // animation_level: 1. Frame-coalesced direct manipulation; no overshoot or release clock.
  const step = (next: number) => {
    drag.current?.finish(true)
    drag.current = null
    commit(next)
  }

  if (compact)
    return (
      <div ref={root} className={cn('lab-split', className)} data-compact="" role="region" aria-label={label}>
        <NavigationStack label={label} onBack={onBack}>
          {[list, ...pages]}
        </NavigationStack>
      </div>
    )
  return (
    <div
      ref={root}
      className={cn('lab-split', className)}
      role="region"
      aria-label={label}
      style={{ '--lab-split-list': `${Math.round(width)}px` } as React.CSSProperties}
    >
      <div className="lab-split-list">{list}</div>
      <ResizeDivider className="lab-split-divider" label={t('lab.panel.resize')}
        value={Math.round(width)} min={minListWidth} max={maxListWidth} reset={defaultListWidth}
        enabled={resizable} onChange={step}
        onDragStart={() => {
          drag.current?.finish(true)
          const host = root.current!
          const divider = host.querySelector<HTMLElement>('.lab-split-divider')!
          const aria = divider.getAttribute('aria-valuenow')!
          host.setAttribute('data-resizing', '')
          drag.current = createResizeDrag({
            paint: raw => {
              const value = clamp(raw)
              host.style.setProperty('--lab-split-drag-list', `${value}px`)
              divider.setAttribute('aria-valuenow', String(value))
            },
            restore: () => {
              host.style.removeProperty('--lab-split-drag-list')
              host.removeAttribute('data-resizing')
              divider.setAttribute('aria-valuenow', divider.getAttribute('data-resize-value') ?? aria)
              divider.removeAttribute('data-resizing')
            },
            commit,
          })
          return width
        }}
        onDragMove={raw => drag.current?.move(raw)}
        onDragEnd={({ cancelled }) => {
          drag.current?.finish(cancelled)
          drag.current = null
        }} />
      <div className="lab-split-detail">
        {pages.length ? (
          <NavigationStack label={`${label}: detail`} onBack={onBack}>
            {pages}
          </NavigationStack>
        ) : (
          placeholder
        )}
      </div>
    </div>
  )
}

/** Quiet centered message for an empty detail column. */
export function SplitPlaceholder({
  icon,
  title,
  children,
}: {
  /** A large, muted icon. */
  icon?: React.ReactNode
  /** One line: what to do (“Select an order”). */
  title: React.ReactNode
  /** Optional help under the title. */
  children?: React.ReactNode
}) {
  return (
    <div className="lab-split-placeholder">
      {icon && <span className="lab-split-placeholder-icon">{icon}</span>}
      <p className="lab-split-placeholder-title">{title}</p>
      {children && <div className="lab-split-placeholder-body">{children}</div>}
    </div>
  )
}
