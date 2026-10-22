'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ScrollArea } from '../scroll'
import { useI18n } from '../i18n'
import { attachPan, canChildPan } from '../physics/gesture'
import { MotionValue, prefersReducedMotion } from '../physics/motion-value'
import { SPRINGS, projectMomentum, rubberBand, type Spring } from '../physics/spring'
import {
  detentHeights,
  dragHeight,
  releaseTarget,
  sheetDim,
  sheetRecede,
  type SheetDetent,
} from './sheet-model'
import { cn } from '../utils'
import './sheet.css'

export type { SheetDetent } from './sheet-model'

export type SheetProps = {
  /** Shows the sheet. It animates in and out; keep it mounted and toggle this. */
  open: boolean
  /** Called with `false` when the person dismisses it (drag down, scrim, Escape), and never with `true`. */
  onOpenChange: (open: boolean) => void
  /** Accessible name of the sheet. */
  label: string
  /** Sheet content; it scrolls inside the sheet. */
  children: React.ReactNode
  /** Heights the sheet rests at, lowest first is not required. Default `['large']`. */
  detents?: readonly SheetDetent[]
  /** Controlled detent. Pair with `onDetentChange`. */
  detent?: SheetDetent
  /** Detent to open at when uncontrolled. Default: the first in `detents`. */
  defaultDetent?: SheetDetent
  /** Called when the person drags or taps the grabber to another detent. */
  onDetentChange?: (detent: SheetDetent) => void
  /** Whether dragging down, the scrim and Escape close it. Default true. */
  dismissible?: boolean
  /** Shows the grabber. Default: when there is more than one detent. */
  grabber?: boolean
  /** Floating chrome over the top of the content: a title and a Done button in glass groups. */
  top?: React.ReactNode
  /** Floating chrome over the bottom: usually a Dock with the sheet's main action. */
  bottom?: React.ReactNode
  /**
   * `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet,
   * like a map with a results sheet; the sheet then has no scrim and no Escape dismissal.
   */
  modal?: boolean
  /** What the sheet becomes on wide screens: a centered `dialog` (default) or still a bottom `sheet`. */
  regular?: 'dialog' | 'sheet'
  /** Width in px from which the sheet is “regular” (wide). Default 720. */
  regularBreakpoint?: number
  /** Renders inside this element (absolutely positioned) instead of the top layer: for embedded previews. */
  container?: HTMLElement | null
  /** On phones, let the page behind recede (scale back) as a large sheet rises. Default true. */
  recede?: boolean
  /** Inline content padding in px. */
  contentPadding?: number
  className?: string
}

const DEFAULT_DETENTS: readonly SheetDetent[] = ['large']

/**
 * A sheet that rises from the bottom, like iOS: it rests at detents (half, full, fit or custom
 * heights), follows the finger when dragged, snaps to the detent a flick projects to, and closes
 * when flicked down. Scrolling inside hands off to dragging the sheet at the top. On wide screens
 * it becomes a centered dialog. The page behind dims and, under a full-height sheet, recedes.
 */
export function Sheet(props: SheetProps) {
  const [mounted, setMounted] = React.useState(props.open)
  if (props.open && !mounted) setMounted(true)
  if (!mounted) return null
  return <SheetPresentation {...props} onExited={() => setMounted(false)} />
}

type Metrics = { width: number; hostHeight: number; topInset: number; natural: number }

function SheetPresentation({
  open,
  onOpenChange,
  label,
  children,
  detents = DEFAULT_DETENTS,
  detent: controlledDetent,
  defaultDetent,
  onDetentChange,
  dismissible = true,
  grabber,
  top,
  bottom,
  modal = true,
  regular = 'dialog',
  regularBreakpoint = 720,
  container,
  recede = true,
  contentPadding,
  className,
  onExited,
}: SheetProps & { onExited: () => void }) {
  const { t } = useI18n()
  const host = React.useRef<HTMLElement | null>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const viewport = React.useRef<HTMLDivElement>(null)
  const body = React.useRef<HTMLDivElement>(null)
  const grabRow = React.useRef<HTMLDivElement>(null)
  const probe = React.useRef<HTMLDivElement>(null)
  const returnFocus = React.useRef<Element | null>(null)
  const [metrics, setMetrics] = React.useState<Metrics | null>(null)

  const inline = !!container
  const presentation: 'sheet' | 'dialog' =
    metrics && metrics.width >= regularBreakpoint && regular === 'dialog' ? 'dialog' : 'sheet'
  const heights = metrics ? detentHeights(detents, metrics) : []
  const showGrabber = presentation === 'sheet' && (grabber ?? detents.length > 1)
  const [localIndex, setLocalIndex] = React.useState(() =>
    Math.max(0, detents.indexOf(defaultDetent ?? detents[0]))
  )
  const index =
    controlledDetent !== undefined ? Math.max(0, detents.indexOf(controlledDetent)) : Math.min(localIndex, detents.length - 1)

  // Motion: `visible` is the sheet's visible height (sheet); `shown` 0–1 and `lift` px (dialog).
  const visible = React.useRef(new MotionValue(0, 0.5)).current
  const shown = React.useRef(new MotionValue(0, 0.004)).current
  const lift = React.useRef(new MotionValue(0, 0.5)).current
  const motionHeight = React.useRef(0)
  const presented = React.useRef(false)
  const dragging = React.useRef(false)
  const live = React.useRef({ heights, metrics, presentation, index, open, dismissible, modal, onOpenChange })
  live.current = { heights, metrics, presentation, index, open, dismissible, modal, onOpenChange }

  const backdrop = React.useMemo<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null
    return (container ?? document).querySelector<HTMLElement>('[data-lab-sheet-backdrop]')
  }, [container])

  const pinned = () => {
    const area = panel.current?.querySelector(':scope > .lab-sheet-scroll')
    return area
      ? Array.from(
          area.querySelectorAll<HTMLElement>(
            ':scope > .lab-scroll-float--bottom, :scope > .lab-scroll-gradient > .lab-scroll-wash--bottom'
          )
        )
      : []
  }
  const paintRecede = (v: number) => {
    const m = live.current.metrics
    if (!backdrop || !m) return
    const q =
      recede && live.current.modal && live.current.presentation === 'sheet' && !prefersReducedMotion()
        ? sheetRecede(v, m.hostHeight - m.topInset)
        : 0
    backdrop.style.transformOrigin = '50% 0'
    backdrop.style.transform = q ? `translate3d(0, ${q * 10}px, 0) scale(${1 - q * 0.06})` : ''
    backdrop.style.clipPath = q ? `inset(0 round ${q * 22}px)` : ''
  }
  const paintSheet = (v: number) => {
    const el = panel.current
    if (!el || live.current.presentation !== 'sheet') return
    const H = motionHeight.current
    if (H) {
      const offset = H - v
      el.style.transform = `translate3d(0, ${offset}px, 0)`
      for (const node of pinned()) node.style.translate = `0 ${-offset}px`
    }
    if (scrim.current)
      scrim.current.style.opacity = live.current.modal ? String(sheetDim(v, live.current.heights)) : '0'
    paintRecede(v)
  }
  /** Switches to transform-only motion: the panel is tall enough for any position, nothing reflows. */
  const beginMotion = () => {
    const el = panel.current
    if (!el || motionHeight.current) return
    motionHeight.current = Math.max(...live.current.heights, visible.get(), 1) + 240
    el.style.height = `${motionHeight.current}px`
    paintSheet(visible.get())
  }
  /** At rest the panel is exactly as tall as it shows, so its scroll area and dock lay out normally. */
  const rest = (height: number) => {
    const el = panel.current
    if (!el) return
    motionHeight.current = 0
    el.style.height = `${height}px`
    el.style.transform = ''
    for (const node of pinned()) node.style.translate = ''
    paintSheet(height)
  }
  const moveTo = (height: number, spring: Spring = SPRINGS.smooth, velocity?: number) => {
    beginMotion()
    return visible.animateTo(height, { spring, velocity }).then((arrived) => {
      if (arrived) rest(height)
      return arrived
    })
  }
  const paintDialog = () => {
    const el = panel.current
    if (!el) return
    const p = shown.get()
    el.style.opacity = String(Math.max(0, Math.min(1, p)))
    el.style.transform = `translate3d(0, ${(1 - p) * 28 + lift.get()}px, 0) scale(${0.96 + 0.04 * p})`
    if (scrim.current) scrim.current.style.opacity = live.current.modal ? String(Math.max(0, Math.min(1, p))) : '0'
  }
  React.useLayoutEffect(() => visible.subscribe(paintSheet), [])
  React.useLayoutEffect(() => {
    const a = shown.subscribe(paintDialog),
      b = lift.subscribe(paintDialog)
    return () => {
      a()
      b()
    }
  }, [])

  // Mount: enter the top layer, remember focus, start measuring.
  React.useLayoutEffect(() => {
    returnFocus.current = document.activeElement
    const element = host.current
    if (element instanceof HTMLDialogElement && !element.open) {
      if (modal) element.showModal()
      else element.show()
    }
    const measure = () => {
      const box = host.current
      if (!box) return
      const content = body.current?.parentElement
      const style = content ? getComputedStyle(content) : null
      const natural =
        (grabRow.current?.offsetHeight ?? 0) +
        (style ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) : 0) +
        (body.current?.offsetHeight ?? 0)
      const next: Metrics = {
        width: box.clientWidth,
        hostHeight: box.clientHeight,
        topInset: 10 + (probe.current?.offsetHeight ?? 0),
        natural: Math.ceil(natural),
      }
      setMetrics((m) =>
        m &&
        m.width === next.width &&
        m.hostHeight === next.hostHeight &&
        m.topInset === next.topInset &&
        m.natural === next.natural
          ? m
          : next
      )
    }
    const observer = new ResizeObserver(measure)
    if (host.current) observer.observe(host.current)
    if (body.current) observer.observe(body.current)
    // Border box: the scroll area's reservations for the floating chrome are padding.
    if (body.current?.parentElement) observer.observe(body.current.parentElement, { box: 'border-box' })
    measure()
    return () => {
      observer.disconnect()
      if (backdrop) {
        backdrop.style.transform = ''
        backdrop.style.clipPath = ''
      }
    }
  }, [])

  // Present, follow detent and size changes, and leave.
  const target = heights[index] ?? 0
  const dialogHeight = metrics ? Math.min(metrics.natural, metrics.hostHeight - 64) : 0
  React.useLayoutEffect(() => {
    if (!metrics) return
    const reduced = prefersReducedMotion()
    if (!open) {
      presented.current = false
      const done = () => {
        // Leave the top layer first: nothing outside a modal dialog can take focus.
        if (host.current instanceof HTMLDialogElement && host.current.open) host.current.close()
        const el = returnFocus.current
        if (el instanceof HTMLElement && el.isConnected) el.focus({ preventScroll: true })
        onExited()
      }
      if (presentation === 'dialog') {
        void shown.animateTo(0, { spring: reduced ? { duration: 0.18, bounce: 0 } : SPRINGS.smooth }).then((a) => a && done())
      } else if (reduced) {
        const el = panel.current
        if (el) el.style.transition = 'opacity 160ms'
        if (el) el.style.opacity = '0'
        if (scrim.current) scrim.current.style.opacity = '0'
        window.setTimeout(done, 170)
      } else {
        beginMotion()
        void visible.animateTo(0, { spring: SPRINGS.smooth }).then((a) => a && done())
      }
      return
    }
    if (presentation === 'dialog') {
      const el = panel.current
      if (el) {
        el.style.height = `${dialogHeight}px`
        motionHeight.current = 0
        for (const node of pinned()) node.style.translate = ''
      }
      paintRecede(0)
      if (!presented.current) {
        presented.current = true
        if (!shown.isAnimating()) shown.set(0)
        void shown.animateTo(1, { spring: reduced ? { duration: 0.2, bounce: 0 } : SPRINGS.smooth })
      } else paintDialog()
      return
    }
    const el = panel.current
    if (el) {
      el.style.opacity = ''
      el.style.translate = ''
    }
    if (!presented.current) {
      presented.current = true
      if (reduced) {
        visible.set(target)
        rest(target)
        return
      }
      // Reopened while still leaving: turn around from where it is.
      if (!visible.isAnimating()) visible.set(0)
      void moveTo(target)
      return
    }
    if (!visible.isAnimating() && !dragging.current) {
      if (Math.abs(visible.get() - target) < 1) rest(target)
      else void moveTo(target)
    }
  }, [open, metrics, presentation, target, dialogHeight])

  const setDetentIndex = (next: number) => {
    if (controlledDetent === undefined) setLocalIndex(next)
    if (next !== live.current.index) onDetentChange?.(detents[next])
  }

  // Drag: the grabber and chrome always; the content when it is scrolled to the top (down) or the
  // sheet can still grow (up). Touch claims early so the browser does not start scrolling first.
  React.useEffect(() => {
    const el = panel.current
    if (!el) return
    let start = 0
    let scale = 1
    const isChrome = (target: Element | null) =>
      !!target && (!viewport.current?.contains(target) || !!target.closest('[data-lab-sheet-handle]'))
    return attachPan(el, () => ({
      axis: 'y',
      touch: 'claim',
      canBegin: ({ target, pointerType }) =>
        live.current.open && (pointerType !== 'mouse' || isChrome(target) || !!target?.closest('.lab-sheet-grabber')),
      shouldStart: ({ direction, target }) => {
        const L = live.current
        if (L.presentation === 'dialog') return direction === 1 && L.dismissible && isChrome(target)
        if (isChrome(target)) return true
        if (direction === 1) return !canChildPan(target, el, 'y', 1)
        return visible.get() < Math.max(...L.heights) - 1
      },
      onStart: () => {
        dragging.current = true
        scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
        if (live.current.presentation === 'dialog') {
          lift.stop()
          start = lift.get()
          return
        }
        visible.stop()
        beginMotion()
        start = visible.get()
      },
      onMove: ({ dy, time }) => {
        const L = live.current
        const move = dy / scale
        if (L.presentation === 'dialog') {
          const y = start + move
          lift.track(y < 0 ? -rubberBand(-y, 300) * 0.5 : y, time)
          return
        }
        visible.track(dragHeight(start - move, L.heights, L.metrics?.hostHeight ?? 800, L.dismissible), time)
      },
      onEnd: ({ vy, cancelled, time }) => {
        dragging.current = false
        const L = live.current
        if (L.presentation === 'dialog') {
          const away = !cancelled && L.dismissible && projectMomentum(lift.get(), vy / scale, 0.99) > 160
          if (away) {
            L.onOpenChange(false)
            void lift.animateTo(0, { spring: SPRINGS.smooth })
          } else void lift.animateTo(0, { spring: SPRINGS.release, velocity: lift.getVelocity(time) })
          return
        }
        const velocity = visible.getVelocity(time)
        const landing = releaseTarget(visible.get(), velocity, L.heights, L.dismissible)
        if (landing.dismiss && !cancelled) {
          // Leave at the finger's speed; the close that follows continues this same motion.
          void visible.animateTo(0, { spring: SPRINGS.smooth, velocity })
          L.onOpenChange(false)
          // A host that keeps the sheet open gets it back at its detent.
          window.setTimeout(() => {
            if (live.current.open && !visible.isAnimating()) void moveTo(live.current.heights[live.current.index] ?? 0)
          }, 400)
          return
        }
        const next = landing.dismiss ? L.index : landing.index
        setDetentIndex(next)
        void moveTo(L.heights[next] ?? landing.height, SPRINGS.release, velocity)
      },
    }))
  }, [])

  const cycle = (step: 1 | -1) => {
    const order = heights.map((h, i) => [h, i] as const).sort((a, b) => a[0] - b[0])
    const at = order.findIndex(([, i]) => i === index)
    const next = order[(at + step + order.length) % order.length][1]
    setDetentIndex(next)
  }
  const requestClose = () => {
    if (dismissible) onOpenChange(false)
  }

  const content = (
    <>
      {modal && <div ref={scrim} className="lab-sheet-scrim" aria-hidden="true" onClick={requestClose} />}
      <div ref={probe} className="lab-sheet-safe-probe" aria-hidden="true" />
      <div
        ref={panel}
        className={cn('lab-sheet', className)}
        data-presentation={presentation}
        data-ready={metrics ? '' : undefined}
        role={inline ? 'dialog' : undefined}
        aria-modal={inline && modal ? true : undefined}
        aria-label={inline ? label : undefined}
        tabIndex={-1}
      >
        {showGrabber && (
          <div ref={grabRow} className="lab-sheet-grabber-row" data-lab-sheet-handle="">
            <button
              type="button"
              className="lab-sheet-grabber"
              aria-label={t('lab.sheet.grabber')}
              onClick={() => cycle(1)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  cycle(event.key === 'ArrowUp' ? 1 : -1)
                }
              }}
            />
          </div>
        )}
        <ScrollArea
          ref={viewport}
          className="lab-sheet-scroll"
          label={label}
          contentPadding={contentPadding}
          top={top}
          bottom={bottom}
        >
          <div ref={body} className="lab-sheet-body">
            {children}
          </div>
        </ScrollArea>
      </div>
    </>
  )

  if (inline)
    return createPortal(
      <div
        ref={host as React.Ref<HTMLDivElement>}
        className="lab-sheet-host"
        data-inline=""
        data-modal={modal || undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && modal) {
            event.stopPropagation()
            requestClose()
          }
        }}
      >
        {content}
      </div>,
      container!
    )
  return createPortal(
    <dialog
      ref={host as React.Ref<HTMLDialogElement>}
      className="lab-sheet-host"
      data-modal={modal || undefined}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
    >
      {content}
    </dialog>,
    document.body
  )
}
