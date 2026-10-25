'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { PresentationHost, usePresented } from '../presentation/host'
import { PresentationHeader } from '../presentation/header'
import { PresentationBody } from '../presentation/body'
import type { PresentationChromeProps } from '../presentation/modal'
import { attachPan, canChildPan } from '../physics/gesture'
import { MotionValue, motionOf, prefersReducedMotion } from '../physics/motion-value'
import { motionFade } from '../theme-config'
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
import { GLASS_INSTANT_ATTRIBUTE } from '../glass/transitions'
import { POP_MOTION } from '../presentation/motion'
import '../presentation/presentation.css'
import './sheet.css'

export type { SheetDetent } from './sheet-model'

export type SheetProps = PresentationChromeProps & {
  /** Shows the sheet. It animates in and out; keep it mounted and toggle this. */
  open: boolean
  /** Called with `false` when the person dismisses it (drag down, scrim, Escape, close bubble), never with `true`. */
  onOpenChange: (open: boolean) => void
  /** Sheet content; it scrolls inside the sheet under the floating header and dock. */
  children: React.ReactNode
  /** Heights the sheet rests at, lowest first is not required. Default `['large']`. */
  detents?: readonly SheetDetent[]
  /** Controlled detent. Pair with `onDetentChange`. */
  detent?: SheetDetent
  /** Detent to open at when uncontrolled. Default: the first in `detents`. */
  defaultDetent?: SheetDetent
  /** Called when the person drags or taps the grabber to another detent. */
  onDetentChange?: (detent: SheetDetent) => void
  /** Whether dragging down, the scrim and Escape close it. Default true. The close bubble always does. */
  dismissible?: boolean
  /** Shows the grabber. Default: when there is more than one detent. */
  grabber?: boolean
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
  /** Content padding in px. Default: the shell gap G (list sections bring their own inset). */
  contentPadding?: number
  /** Focused when the sheet opens. Default: the sheet itself. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused after it closes, when the control that opened it may be gone. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Class name of the sheet panel. */
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
  const { mounted, exited } = usePresented(props.open)
  if (!mounted) return null
  return <SheetPresentation {...props} onExited={exited} />
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
  title,
  leading,
  trailing,
  showClose = true,
  header,
  dock,
  modal = true,
  regular = 'dialog',
  regularBreakpoint = 720,
  container,
  recede = true,
  contentPadding,
  initialFocusRef,
  returnFocusRef,
  className,
  onExited,
}: SheetProps & { onExited: () => void }) {
  const { t } = useI18n()
  const host = React.useRef<HTMLElement | null>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const viewport = React.useRef<HTMLDivElement>(null)
  const grabRow = React.useRef<HTMLDivElement>(null)
  const probe = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const [metrics, setMetrics] = React.useState<Metrics | null>(null)
  /** The body's natural height (content + reserved chrome), reported by PresentationBody. */
  const bodyNatural = React.useRef(0)
  const measureRef = React.useRef<() => void>(() => {})

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
    const area = panel.current?.querySelector('.lab-presentation-scroll')
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
  /** While the panel moves, its glass rides it as is (no springs of its own) and leaves with it. */
  const riding = (on: boolean) => panel.current?.toggleAttribute(GLASS_INSTANT_ATTRIBUTE, on)
  /** Switches to transform-only motion: the panel is tall enough for any position, nothing reflows. */
  const beginMotion = () => {
    const el = panel.current
    riding(true)
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
    riding(false)
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

  // Mount: start measuring the host and the body.
  React.useLayoutEffect(() => {
    const measure = () => {
      const box = host.current
      if (!box) return
      const next: Metrics = {
        width: box.clientWidth,
        hostHeight: box.clientHeight,
        topInset: 10 + (probe.current?.offsetHeight ?? 0),
        natural: Math.ceil((grabRow.current?.offsetHeight ?? 0) + bodyNatural.current),
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
    measureRef.current = measure
    const observer = new ResizeObserver(measure)
    if (host.current) observer.observe(host.current)
    measure()
    return () => {
      observer.disconnect()
      if (backdrop) {
        backdrop.style.transform = ''
        backdrop.style.clipPath = ''
      }
    }
  }, [container])

  // Present, follow detent and size changes, and leave.
  const target = heights[index] ?? 0
  const dialogHeight = metrics ? Math.min(metrics.natural, metrics.hostHeight - 64) : 0
  React.useLayoutEffect(() => {
    if (!metrics) return
    const reduced = prefersReducedMotion()
    const motion = motionOf()
    if (!open) {
      presented.current = false
      // Unmounting the host leaves the top layer and returns focus.
      const done = () => onExited()
      if (presentation === 'dialog') {
        // Like Modal: the panel and the dim fade out on one fixed curve that ends exactly at its
        // length (a spring's tail would leave it faintly on screen), while the move eases back.
        const length = motionFade(motion, POP_MOTION.fadeOut)
        riding(true)
        void shown.animateTo(0, { spring: reduced ? { duration: length, bounce: 0 } : SPRINGS.smooth, instant: length === 0 })
        const el = panel.current
        const fades = [el, scrim.current].flatMap((node) => {
          if (!node || !length || typeof node.animate !== 'function') return []
          const from = getComputedStyle(node).opacity
          node.getAnimations().forEach((animation) => animation.cancel())
          return [node.animate([{ opacity: from }, { opacity: 0 }], { duration: length * 1000, easing: POP_MOTION.fadeEasing, fill: 'forwards' })]
        })
        if (!fades.length) done()
        else void Promise.all(fades.map((fade) => fade.finished)).then(done, () => {})
      } else if (reduced) {
        // The panel fades out, then unmounts once the fade has ended.
        const fade = motionFade(motion, 0.16)
        const el = panel.current
        if (el) el.style.transition = fade ? `opacity ${fade * 1000}ms` : ''
        if (el) el.style.opacity = '0'
        if (scrim.current) scrim.current.style.opacity = '0'
        if (fade) window.setTimeout(done, fade * 1000 + 10)
        else done()
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
        // Opened again while fading out: the fade gives way to the spring.
        for (const node of [el, scrim.current]) node?.getAnimations?.().forEach((animation) => animation.cancel())
        if (!shown.isAnimating()) shown.set(0)
        const fade = motionFade(motion, 0.2)
        riding(true)
        void shown
          .animateTo(1, { spring: reduced ? { duration: fade, bounce: 0 } : SPRINGS.smooth, instant: fade === 0 })
          .then((arrived) => arrived && riding(false))
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
    if (dragging.current) return
    if (visible.isAnimating()) {
      // The detent moved while rising (a fit sheet's content measured late): retarget in flight.
      if (Math.abs(visible.getTarget() - target) >= 1) void moveTo(target)
    } else if (Math.abs(visible.get() - target) < 1) rest(target)
    else void moveTo(target)
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
  const top =
    header !== undefined ? (
      header
    ) : (
      <PresentationHeader
        title={title}
        leading={leading}
        titleId={titleId}
        trailing={trailing}
        onClose={showClose ? () => open && onOpenChange(false) : undefined}
        closeLabel={t('lab.composer.closeLabel', { label })}
      />
    )

  return (
    <PresentationHost
      ref={host}
      kind="sheet"
      label={label}
      labelledBy={header === undefined && leading == null && title != null ? titleId : undefined}
      modal={modal}
      container={container}
      initialFocusRef={initialFocusRef ?? panel}
      returnFocusRef={returnFocusRef}
      onEscape={requestClose}
    >
      {modal && <div ref={scrim} className="lab-sheet-scrim" aria-hidden="true" onClick={requestClose} />}
      <div ref={probe} className="lab-sheet-safe-probe" aria-hidden="true" />
      <div
        ref={panel}
        className={cn('lab-sheet', className)}
        data-presentation={presentation}
        data-ready={metrics ? '' : undefined}
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
        <PresentationBody
          ref={viewport}
          label={label}
          top={top}
          bottom={dock}
          fill
          contentPadding={contentPadding}
          onNaturalHeight={(height) => {
            bodyNatural.current = height
            measureRef.current()
          }}
        >
          {children}
        </PresentationBody>
      </div>
    </PresentationHost>
  )
}
