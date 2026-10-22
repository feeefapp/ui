'use client'

import * as React from 'react'
import { attachPan } from '../physics/gesture'
import { LabMotionValue } from '../physics/motion-value'
import { LAB_SPRINGS, rubberBandClamp } from '../physics/spring'
import { LabNavigationStack } from './navigation-stack'
import { cn } from '../utils'
import './split-view.css'

export type LabSplitViewProps = {
  /** The list column: usually a LabNavigationPage with selectable rows. */
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
  /** Called when the divider is dragged or moved with the keyboard; persist it if you like. */
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
export function LabSplitView({
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
}: LabSplitViewProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const divider = React.useRef<HTMLDivElement>(null)
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

  // The column width is a motion value: dragging tracks it, release springs it into bounds.
  const motion = React.useRef<LabMotionValue | null>(null)
  if (!motion.current) motion.current = new LabMotionValue(width, 0.5)
  const live = React.useRef({ width, minListWidth, maxListWidth, onListWidthChange, controlledWidth })
  live.current = { width, minListWidth, maxListWidth, onListWidthChange, controlledWidth }
  const paint = React.useCallback((value: number) => {
    root.current?.style.setProperty('--lab-split-list', `${Math.round(value)}px`)
  }, [])
  React.useLayoutEffect(() => motion.current!.subscribe(paint), [paint])
  React.useLayoutEffect(() => {
    if (!motion.current!.isAnimating()) {
      motion.current!.set(width)
      paint(width)
    }
  }, [width, compact, paint])

  const commit = React.useCallback((next: number) => {
    const L = live.current
    const clamped = Math.round(Math.max(L.minListWidth, Math.min(L.maxListWidth, next)))
    if (L.controlledWidth === undefined) setLocalWidth(clamped)
    L.onListWidthChange?.(clamped)
    return clamped
  }, [])

  React.useEffect(() => {
    const el = divider.current
    if (!el || !resizable || compact) return
    let start = 0
    return attachPan(el, () => ({
      axis: 'x',
      threshold: 1,
      onStart: () => {
        motion.current!.stop()
        start = motion.current!.get()
        root.current?.setAttribute('data-resizing', '')
      },
      onMove: ({ dx, time }) => {
        const L = live.current
        const rtl = getComputedStyle(root.current!).direction === 'rtl'
        const raw = start + (rtl ? -dx : dx)
        motion.current!.track(rubberBandClamp(raw, L.minListWidth, L.maxListWidth, 240), time)
      },
      onEnd: ({ time }) => {
        root.current?.removeAttribute('data-resizing')
        const velocity = motion.current!.getVelocity(time)
        const target = commit(motion.current!.get())
        void motion.current!.animateTo(target, { spring: LAB_SPRINGS.release, velocity })
      },
    }))
  }, [resizable, compact, commit])

  const step = (delta: number) => {
    const target = commit(width + delta)
    void motion.current!.animateTo(target, { spring: LAB_SPRINGS.snappy })
  }

  if (compact)
    return (
      <div ref={root} className={cn('lab-split', className)} data-compact="" role="region" aria-label={label}>
        <LabNavigationStack label={label} onBack={onBack}>
          {[list, ...pages]}
        </LabNavigationStack>
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
      <div
        ref={divider}
        className="lab-split-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the list"
        aria-valuenow={Math.round(width)}
        aria-valuemin={minListWidth}
        aria-valuemax={maxListWidth}
        tabIndex={resizable ? 0 : undefined}
        data-resizable={resizable || undefined}
        onDoubleClick={() => resizable && step(defaultListWidth - width)}
        onKeyDown={(event) => {
          if (!resizable) return
          const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
          const toward = (key: string) => (key === 'ArrowRight') !== rtl
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') step(toward(event.key) ? 24 : -24)
          else if (event.key === 'Home') step(minListWidth - width)
          else if (event.key === 'End') step(maxListWidth - width)
          else return
          event.preventDefault()
        }}
      />
      <div className="lab-split-detail">
        {pages.length ? (
          <LabNavigationStack label={`${label}: detail`} onBack={onBack}>
            {pages}
          </LabNavigationStack>
        ) : (
          placeholder
        )}
      </div>
    </div>
  )
}

/** Quiet centered message for an empty detail column. */
export function LabSplitPlaceholder({
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
