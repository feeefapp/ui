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
  detentHeight,
  detentHeights,
  dragHeight,
  flingStep,
  focusRaise,
  freeTarget,
  nearestDetent,
  releaseTarget,
  sheetDim,
  sheetFrame,
  sheetMorphFrame,
  sheetRecede,
  sheetScrollStep,
  wheelDismisses,
  wheelHeight,
  type SheetDetent,
  type SheetFrame,
  type SheetRect,
} from './sheet-model'
import { cn } from '../utils'
import { GLASS_INSTANT_ATTRIBUTE, settleGlass } from '../glass/transitions'
import { POP_MOTION } from '../presentation/motion'
import { SheetPane, useHostWidth } from './sheet-pane'
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
  /**
   * Heights the sheet rests at, in any order. Default `['large']`. `peek` is just the header (a
   * search field, like Maps), so a sheet with `['peek', 'medium', 'large']` lives on the page.
   */
  detents?: readonly SheetDetent[]
  /** Controlled detent. Pair with `onDetentChange`. */
  detent?: SheetDetent
  /** Detent to open at when uncontrolled. Default: the first in `detents`. */
  defaultDetent?: SheetDetent
  /** Called when the person drags, taps the grabber, focuses a field or taps the dimmed page. */
  onDetentChange?: (detent: SheetDetent) => void
  /**
   * `true` (default): a released sheet snaps to the detent its flick projects to. `false`: it rests
   * wherever it is let go (after the flick's momentum), anywhere between its lowest and highest
   * detents, like Flutter's DraggableScrollableSheet without snapping.
   */
  snap?: boolean
  /** Whether dragging down, the scrim and Escape close it. Default true. The close bubble always does. */
  dismissible?: boolean
  /** Shows the grabber. Default: when there is more than one detent. */
  grabber?: boolean
  /**
   * `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet at
   * every height, with no scrim and no Escape dismissal (a `pane` still closes on Escape while focus
   * is inside it).
   */
  modal?: boolean
  /**
   * The page stays usable (no dim) while the sheet rests at or below this detent, and dims as it
   * rises past it, like iOS `presentationBackgroundInteraction(.enabled(upThrough:))`: a map with
   * its results sheet. Tapping the dimmed page brings the sheet back down to it.
   */
  backgroundInteraction?: SheetDetent
  /**
   * Whether a phone sheet with a partial detent floats: inset from the edges on glass, reaching
   * the edges and turning opaque as it rises to full height (iOS 26). Default: true when a detent
   * is below `large`. A sheet with only full-height detents is always attached and opaque.
   */
  floating?: boolean
  /**
   * The control that opened the sheet. The sheet grows out of it and returns into it when it
   * closes (unless it is dragged away), and the control hides meanwhile, like an iOS 26 toolbar
   * button morphing into its sheet.
   */
  source?: React.RefObject<HTMLElement | null>
  /**
   * The detent a text field focused inside raises the sheet to. Default: from `peek`, the highest
   * detent (typing in a Maps search bar opens the sheet); otherwise it stays. `null` never raises.
   */
  focusDetent?: SheetDetent | null
  /**
   * What the sheet becomes on wide screens: a centered `dialog` (default), still a bottom `sheet`,
   * a floating glass `card` at the leading edge with the same detents (iPad Maps), or a `pane`: an
   * inspector beside the page, a full-height opaque panel sliding in from `paneSide` with the close
   * bubble floating beside it. Use `pane` for the details of the thing the page is about; with it
   * the phone sheet fits its content by default (`detents` `['fit']`) and pads 16 (a card's
   * inside), and `useSheet()` is null in the wide panel.
   */
  regular?: 'dialog' | 'sheet' | 'card' | 'pane'
  /** Width in px from which the sheet is “regular” (wide). Default 720. */
  regularBreakpoint?: number
  /** Width of the `card` presentation in px. Default 380. */
  cardWidth?: number
  /** Width of the `pane` presentation in px. Default 420, at most 60% of the window. */
  paneWidth?: number
  /** The side the `pane` presentation slides in from: `end` (default; the right in LTR) or `start`. */
  paneSide?: 'end' | 'start'
  /** Renders inside this element (absolutely positioned) instead of the top layer: for embedded previews. */
  container?: HTMLElement | null
  /** On phones, let the page behind recede (scale back) as a large modal sheet rises. Default true. */
  recede?: boolean
  /** Content padding in px. Default: the shell gap G (list sections bring their own inset); 16 with `regular: 'pane'`. */
  contentPadding?: number
  /** Focused when the sheet opens. Default: the sheet itself. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused after it closes, when the control that opened it may be gone. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Class name of the sheet panel. */
  className?: string
}

/** What content inside a sheet can read: where it rests and how far it is expanded. */
export type SheetState = {
  /** The detent the sheet rests at (it changes when a drag or a tap settles). */
  detent: SheetDetent
  /** 0 at the lowest partial height … 1 at full height, every frame (subscribe to paint with it). */
  expansion: MotionValue
  /** The visible height in px, every frame (a free sheet rests between detents). */
  height: MotionValue
  /** Moves the sheet to another of its detents. */
  setDetent: (detent: SheetDetent) => void
  /** How the sheet is presented right now. */
  presentation: 'sheet' | 'card' | 'dialog'
}

const SheetContext = React.createContext<SheetState | null>(null)

/**
 * The sheet this component is inside, or null: its resting detent, its live expansion and a way
 * to move it. Use it to show more at higher detents (Maps shows only its search bar at `peek`).
 */
export function useSheet() {
  return React.useContext(SheetContext)
}

const DEFAULT_DETENTS: readonly SheetDetent[] = ['large']
const PANE_DETENTS: readonly SheetDetent[] = ['fit']
/** The sheet growing out of its source, and flying back into it. */
const MORPH_OPEN: Spring = { duration: 0.46, bounce: 0.16 }
const MORPH_CLOSE: Spring = { duration: 0.36, bounce: 0.08 }

/**
 * A sheet that rises from the bottom, like iOS 26/27: it rests at detents (just its header, half,
 * full, fit or custom heights), follows the finger, snaps where a flick projects and closes when
 * flicked down. Below full height it floats inset from the edges on glass; rising, it reaches the
 * edges and turns opaque in one continuous motion. It can grow out of the button that opened it,
 * leave the page usable at low detents, and becomes a dialog, a floating card or an inspector pane
 * on wide screens, so you write the content once.
 */
export function Sheet(props: SheetProps) {
  return props.regular === 'pane' ? <PaneSheet {...props} /> : <BottomSheet {...props} />
}

function BottomSheet(props: SheetProps) {
  const { mounted, exited } = usePresented(props.open)
  if (!mounted) return null
  return <SheetPresentation {...props} onExited={exited} />
}

/** `regular: 'pane'`: the side panel from the breakpoint, a bottom sheet below it. */
function PaneSheet(props: SheetProps) {
  const width = useHostWidth(props.container)
  if (width >= (props.regularBreakpoint ?? 720)) return <SheetPane {...props} />
  return (
    <BottomSheet
      {...props}
      regular="sheet"
      detents={props.detents ?? PANE_DETENTS}
      contentPadding={props.contentPadding ?? 16}
    />
  )
}

type Metrics = {
  width: number
  hostHeight: number
  topInset: number
  natural: number
  peek: number
  /** The floating gap and the sheet radius, resolved from the theme tokens. */
  inset: number
  radius: number
}

/** Rendered px per layout px of `el` (a sheet inside a scaled demo frame). */
function scaleOf(el: HTMLElement) {
  return el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
}

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]), textarea, [contenteditable=""], [contenteditable="true"]'

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
  snap = true,
  grabber,
  title,
  leading,
  trailing,
  showClose = true,
  header,
  dock,
  modal = true,
  backgroundInteraction,
  floating,
  source,
  focusDetent,
  regular = 'dialog',
  regularBreakpoint = 720,
  cardWidth = 380,
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
  const surface = React.useRef<HTMLDivElement>(null)
  const solid = React.useRef<HTMLDivElement>(null)
  const column = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const viewport = React.useRef<HTMLDivElement>(null)
  const grabRow = React.useRef<HTMLDivElement>(null)
  const probe = React.useRef<HTMLDivElement>(null)
  const tokens = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const [metrics, setMetrics] = React.useState<Metrics | null>(null)
  /** The body's natural height (content + reserved chrome), reported by PresentationBody. */
  const bodyNatural = React.useRef(0)
  const measureRef = React.useRef<() => void>(() => {})

  const wide = !!metrics && metrics.width >= regularBreakpoint
  const presentation: 'sheet' | 'card' | 'dialog' = wide && regular !== 'sheet' && regular !== 'pane' ? regular : 'sheet'
  const heights = metrics ? detentHeights(detents, metrics) : []
  const large = metrics ? detentHeight('large', metrics) : 0
  const hasPartial = heights.some((h) => h < large - 0.5)
  const mode: 'float' | 'attached' | 'card' =
    presentation === 'card' ? 'card' : (floating ?? hasPartial) ? 'float' : 'attached'
  /** The content column keeps the floating gap at every height, so nothing reflows while it moves. */
  const columnInset = presentation === 'dialog' || mode === 'attached' ? 0 : (metrics?.inset ?? 0)
  const undimmed = backgroundInteraction !== undefined && metrics ? detentHeight(backgroundInteraction, metrics) : null
  const dims = modal || backgroundInteraction !== undefined
  const hostModal = modal && backgroundInteraction === undefined
  const showGrabber = presentation !== 'dialog' && (grabber ?? detents.length > 1)
  const [localIndex, setLocalIndex] = React.useState(() =>
    Math.max(0, detents.indexOf(defaultDetent ?? detents[0]))
  )
  const index =
    controlledDetent !== undefined ? Math.max(0, detents.indexOf(controlledDetent)) : Math.min(localIndex, detents.length - 1)
  /** A free sheet's rest height, and the detent reported with it (a controlled host echoes it back). */
  const [freeHeight, setFreeHeight] = React.useState<number | null>(null)
  const reported = React.useRef<SheetDetent | null>(null)
  const minHeight = heights.length ? Math.min(...heights) : 0
  const maxHeight = heights.length ? Math.max(...heights) : 0
  const free = !snap && freeHeight !== null && detents[index] === reported.current
  /** A sheet that changes height: its content gestures grow it before they scroll, and back. */
  const resizable = presentation !== 'dialog' && (!snap || new Set(heights).size > 1)

  // Motion: `visible` is the sheet's visible height (sheet, card); `shown` 0–1 and `lift` px
  // (dialog); `morph` 0–1 the growth out of the source; `expansion` mirrors the frame for content.
  const visible = React.useRef(new MotionValue(0, 0.5)).current
  const shown = React.useRef(new MotionValue(0, 0.004)).current
  const lift = React.useRef(new MotionValue(0, 0.5)).current
  const morph = React.useRef(new MotionValue(1, 0.002)).current
  const expansion = React.useRef(new MotionValue(0, 0.001)).current
  const motionHeight = React.useRef(0)
  const presented = React.useRef(false)
  const dragging = React.useRef(false)
  /** Set while the sheet grows out of (or back into) its source: the rects of that morph. */
  const morphing = React.useRef<{ source: SheetRect; radius: number; element: HTMLElement; opacity: string } | null>(null)
  const draggedAway = React.useRef(false)
  const live = React.useRef({
    heights,
    large,
    metrics,
    presentation,
    mode,
    index,
    open,
    dismissible,
    dims,
    hostModal,
    undimmed,
    onOpenChange,
  })
  live.current = { heights, large, metrics, presentation, mode, index, open, dismissible, dims, hostModal, undimmed, onOpenChange }
  const gesture = React.useRef({ snap, resizable, minHeight, maxHeight })
  gesture.current = { snap, resizable, minHeight, maxHeight }

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
      recede && live.current.hostModal && live.current.presentation === 'sheet' && !prefersReducedMotion()
        ? sheetRecede(v, m.hostHeight - m.topInset) * morph.get()
        : 0
    backdrop.style.transformOrigin = '50% 0'
    backdrop.style.transform = q ? `translate3d(0, ${q * 10}px, 0) scale(${1 - q * 0.06})` : ''
    backdrop.style.clipPath = q ? `inset(0 round ${q * 22}px)` : ''
  }
  /** The surface (glass + opaque layer) at one frame; `offset` is how far the panel hangs below. */
  const paintSurface = (frame: SheetFrame, offset: number) => {
    const s = surface.current
    if (!s) return
    s.style.insetInline = `${frame.gap}px`
    s.style.bottom = `${offset + frame.gap}px`
    s.style.borderEndStartRadius = s.style.borderEndEndRadius = `${frame.bottomRadius}px`
    if (solid.current) solid.current.style.opacity = String(frame.solid)
    if (expansion.get() !== frame.expansion) expansion.set(frame.expansion)
  }
  const paintScrim = (v: number) => {
    const L = live.current
    const el = scrim.current
    if (!el) return
    const dim = L.dims ? sheetDim(v, L.heights, L.undimmed, L.large) * morph.get() : 0
    el.style.opacity = String(dim)
    // Below the undimmed detent the page under the scrim stays usable.
    if (L.undimmed !== null) el.style.pointerEvents = dim > 0.02 ? 'auto' : 'none'
  }
  const paintSheet = (v: number) => {
    const el = panel.current
    const L = live.current
    if (!el || L.presentation === 'dialog' || !L.metrics) return
    const H = motionHeight.current
    const offset = H ? H - v : 0
    if (H) {
      el.style.transform = `translate3d(0, ${offset}px, 0)`
      for (const node of pinned()) node.style.translate = `0 ${-offset}px`
    }
    paintSurface(
      sheetFrame(v, { heights: L.heights, large: L.large, inset: L.metrics.inset, radius: L.metrics.radius, mode: L.mode }),
      offset
    )
    paintScrim(v)
    paintRecede(v)
  }
  /** One frame of the morph: the panel at rest, clipped to the source's size and moved over it. */
  const paintMorph = (p: number) => {
    const el = panel.current
    const m = morphing.current
    if (!el || !m || live.current.presentation === 'dialog') return
    const height = el.offsetHeight
    const rect: SheetRect = {
      x: el.offsetLeft,
      y: (live.current.metrics?.hostHeight ?? height) - height,
      width: el.offsetWidth,
      height,
    }
    const frame = sheetMorphFrame(p, rect, m.source, m.radius, live.current.metrics?.radius ?? 28)
    el.style.transform = frame.transform
    el.style.clipPath = frame.clip
    if (column.current) column.current.style.opacity = String(frame.content)
    // The source hides once the sheet covers it, and shows again as the sheet lands back in it.
    m.element.style.opacity = p > 0.08 ? '0' : m.opacity
    paintScrim(visible.get())
    paintRecede(visible.get())
  }
  const endMorph = () => {
    const m = morphing.current
    const el = panel.current
    morphing.current = null
    if (m) m.element.style.opacity = m.opacity
    if (el) {
      el.style.clipPath = ''
      if (!motionHeight.current) el.style.transform = ''
    }
    if (column.current) column.current.style.opacity = ''
  }
  /** While the panel moves, its glass rides it as is (no springs of its own) and leaves with it. */
  const riding = (on: boolean) => {
    const el = panel.current
    if (!el) return
    if (on) el.setAttribute(GLASS_INSTANT_ATTRIBUTE, '')
    else settleGlass(el)
  }
  /** Switches to transform-only motion: the panel is tall enough for any position, nothing reflows. */
  const beginMotion = () => {
    const el = panel.current
    riding(true)
    if (morphing.current) {
      morph.stop()
      morph.set(1)
      endMorph()
    }
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
    if (!morphing.current) riding(false)
    el.style.height = `${height}px`
    if (!morphing.current) el.style.transform = ''
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
  /** The source to grow out of, in host pixels, or null when there is none to see. */
  const sourceRect = () => {
    const box = host.current
    const origin = source?.current
    if (!box || !origin?.isConnected) return null
    // A button hugged by its glass bubble grows out of the bubble.
    const member = origin.closest<HTMLElement>('[data-glass-member]')
    const element =
      member && member.getBoundingClientRect().width - origin.getBoundingClientRect().width < 16 ? member : origin
    const r = element.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    if (!r.width || !r.height) return null
    const scale = b.width / (box.offsetWidth || 1) || 1
    const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || r.height / 2
    return {
      element: origin,
      radius,
      source: {
        x: (r.left - b.left) / scale,
        y: (r.top - b.top) / scale,
        width: r.width / scale,
        height: r.height / scale,
      },
    }
  }
  const paintDialog = () => {
    const el = panel.current
    if (!el) return
    const p = shown.get()
    el.style.opacity = String(Math.max(0, Math.min(1, p)))
    el.style.transform = `translate3d(0, ${(1 - p) * 28 + lift.get()}px, 0) scale(${0.96 + 0.04 * p})`
    if (scrim.current) scrim.current.style.opacity = live.current.dims ? String(Math.max(0, Math.min(1, p))) : '0'
  }
  React.useLayoutEffect(() => visible.subscribe(paintSheet), [])
  React.useLayoutEffect(() => morph.subscribe(paintMorph), [])
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
      const token = tokens.current
      const inset = token?.offsetWidth ?? 8
      const radius = token?.offsetHeight ?? 28
      const L = live.current
      const gap = L.presentation === 'dialog' || L.mode === 'attached' ? 0 : inset
      const grab = grabRow.current?.offsetHeight ?? 0
      // Peek: the grabber, the floating header and the same gap again below it.
      const float = panel.current?.querySelector<HTMLElement>('.lab-presentation-scroll > .lab-scroll-float--top')
      const peek = float ? grab + 2 * float.offsetTop + float.offsetHeight + gap : grab + 64 + gap
      const next: Metrics = {
        width: box.clientWidth,
        hostHeight: box.clientHeight,
        topInset: 10 + (probe.current?.offsetHeight ?? 0),
        natural: Math.ceil(grab + bodyNatural.current + gap),
        peek: Math.ceil(peek),
        inset,
        radius,
      }
      setMetrics((m) =>
        m &&
        m.width === next.width &&
        m.hostHeight === next.hostHeight &&
        m.topInset === next.topInset &&
        m.natural === next.natural &&
        m.peek === next.peek &&
        m.inset === next.inset &&
        m.radius === next.radius
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
      const m = morphing.current
      if (m) m.element.style.opacity = m.opacity
    }
  }, [container])
  // The column inset (and with it fit and peek) follows the presentation and floating mode.
  React.useLayoutEffect(() => measureRef.current(), [columnInset])

  // Present, follow detent and size changes, and leave.
  const target = free ? Math.max(minHeight, Math.min(maxHeight, freeHeight!)) : (heights[index] ?? 0)
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
        const back = !draggedAway.current && !dragging.current ? sourceRect() : null
        draggedAway.current = false
        if (back && !visible.isAnimating()) {
          // Fly back into the control that opened it.
          riding(true)
          morphing.current = { ...back, opacity: morphing.current?.opacity ?? back.element.style.opacity }
          void morph.animateTo(0, { spring: MORPH_CLOSE }).then((arrived) => {
            if (!arrived) return
            endMorph()
            done()
          })
        } else {
          beginMotion()
          void visible.animateTo(0, { spring: SPRINGS.smooth }).then((a) => a && done())
        }
      }
      return
    }
    if (presentation === 'dialog') {
      const el = panel.current
      if (morphing.current) {
        morph.stop()
        morph.set(1)
        endMorph()
      }
      if (el) {
        el.style.height = `${dialogHeight}px`
        motionHeight.current = 0
        for (const node of pinned()) node.style.translate = ''
      }
      const s = surface.current
      if (s) s.removeAttribute('style')
      if (solid.current) solid.current.style.opacity = ''
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
      const from = !visible.isAnimating() && !morph.isAnimating() ? sourceRect() : null
      if (from) {
        // Grow out of the control that opened it: the panel takes its place at rest at once and
        // a clip the size of the control opens up to it.
        morphing.current = { ...from, opacity: from.element.style.opacity }
        riding(true)
        visible.stop()
        visible.set(target)
        rest(target)
        morph.set(0)
        void morph.animateTo(1, { spring: MORPH_OPEN }).then((arrived) => {
          if (!arrived) return
          endMorph()
          riding(false)
          rest(visible.get())
        })
        return
      }
      if (morph.isAnimating() && morphing.current) {
        // Reopened while flying back into the source: turn around.
        void morph.animateTo(1, { spring: MORPH_OPEN }).then((arrived) => {
          if (!arrived) return
          endMorph()
          riding(false)
        })
        return
      }
      // Reopened while still leaving: turn around from where it is.
      if (!visible.isAnimating()) visible.set(0)
      void moveTo(target)
      return
    }
    if (dragging.current) return
    if (morphing.current) {
      // The detent moved while growing (a fit sheet measured late): the clip follows the panel.
      visible.set(target)
      rest(target)
      paintMorph(morph.get())
      return
    }
    if (visible.isAnimating()) {
      // The detent moved while rising (a fit sheet's content measured late): retarget in flight.
      if (Math.abs(visible.getTarget() - target) >= 1) void moveTo(target)
    } else if (Math.abs(visible.get() - target) < 1) rest(target)
    else void moveTo(target)
  }, [open, metrics, presentation, mode, target, dialogHeight])

  const setDetentIndex = (next: number) => {
    setFreeHeight(null)
    reported.current = null
    if (controlledDetent === undefined) setLocalIndex(next)
    if (next !== live.current.index) onDetentChange?.(detents[next])
  }
  const setDetentRef = React.useRef(setDetentIndex)
  setDetentRef.current = setDetentIndex
  /** A free sheet rests at `height`; the nearest detent is reported as its detent. */
  const settleFree = (height: number) => {
    const next = nearestDetent(height, live.current.heights)
    reported.current = detents[next]
    setFreeHeight(height)
    if (controlledDetent === undefined) setLocalIndex(next)
    if (next !== live.current.index) onDetentChange?.(detents[next])
  }
  const settleFreeRef = React.useRef(settleFree)
  settleFreeRef.current = settleFree
  /** Where a released sheet goes (snap or free) at `velocity`; false when it was dismissed. */
  const releaseSheet = (velocity: number, cancelled: boolean) => {
    const L = live.current
    const G = gesture.current
    if (!G.snap) {
      const landing = freeTarget(visible.get(), velocity, L.heights, L.dismissible)
      if (landing.dismiss && !cancelled) return dismissAway(velocity)
      const height = landing.dismiss ? visible.get() : landing.height
      settleFreeRef.current(height)
      void moveTo(height, SPRINGS.release, velocity)
      return
    }
    const landing = releaseTarget(visible.get(), velocity, L.heights, L.dismissible)
    if (landing.dismiss && !cancelled) return dismissAway(velocity)
    const next = landing.dismiss ? L.index : landing.index
    setDetentRef.current(next)
    void moveTo(L.heights[next] ?? landing.height, SPRINGS.release, velocity)
  }
  /** Leave at the finger's speed; the close that follows continues this same motion. */
  const dismissAway = (velocity: number) => {
    draggedAway.current = true
    void visible.animateTo(0, { spring: SPRINGS.smooth, velocity })
    live.current.onOpenChange(false)
    // A host that keeps the sheet open gets it back at its detent.
    window.setTimeout(() => {
      draggedAway.current = false
      if (live.current.open && !visible.isAnimating()) void moveTo(live.current.heights[live.current.index] ?? 0)
    }, 400)
  }
  const releaseRef = React.useRef(releaseSheet)
  releaseRef.current = releaseSheet

  // Drag: the grabber and chrome always move the sheet. On a resizable sheet a gesture over the
  // content is split between the sheet and its scroll (grow, then scroll; scroll back, then
  // shrink), the way iOS sheets and Flutter's DraggableScrollableSheet behave, so the sheet drives
  // the content's scroll and momentum itself for touch. On a fixed sheet the content scrolls
  // natively and drags the sheet down only from its top. Touch claims early so the browser does
  // not start scrolling first.
  React.useEffect(() => {
    const el = panel.current
    if (!el) return
    let start = 0
    let scale = 1
    /** A content gesture on a resizable sheet: the split state and the last finger offset. */
    let content: { state: { raw: number; scroll: number }; last: number; scrollMax: number } | null = null
    let fling = 0
    const stopFling = () => {
      if (fling) cancelAnimationFrame(fling)
      fling = 0
    }
    /** The element that scrolls (the scroll area's viewport, inside its frame with the floats). */
    const scroller = () =>
      viewport.current?.querySelector<HTMLElement>(':scope > .lab-scroll-viewport') ?? viewport.current
    // The grabber, the floating header and dock, and anything marked as a handle move the sheet.
    const isChrome = (target: Element | null) =>
      !!target && (!scroller()?.contains(target) || !!target.closest('[data-lab-sheet-handle]'))
    /** How far the content can scroll once the sheet is at `max` (measured at the current rest height). */
    const scrollMaxAt = (max: number) => {
      const v = scroller()
      if (!v) return 0
      return Math.max(0, v.scrollHeight - v.clientHeight - Math.max(0, max - visible.get()))
    }
    /** The content keeps moving after a flick; reaching its top going down, it hands on to the sheet. */
    const flingContent = (velocity: number) => {
      const v = scroller()
      if (!v) return
      stopFling()
      let speed = velocity
      let scroll = v.scrollTop
      let last = performance.now()
      const max = v.scrollHeight - v.clientHeight
      const frame = (now: number) => {
        const step = flingStep(scroll, speed, Math.min(64, now - last))
        last = now
        scroll = step.scroll
        speed = step.velocity
        if (scroll <= 0 && speed < 0) {
          v.scrollTop = 0
          fling = 0
          // What is left of the flick carries the sheet down (and may close it).
          if (speed < -80) {
            beginMotion()
            releaseRef.current(speed, false)
          }
          return
        }
        v.scrollTop = Math.min(max, scroll)
        if (scroll >= max || Math.abs(speed) < 12) {
          fling = 0
          return
        }
        fling = requestAnimationFrame(frame)
      }
      fling = requestAnimationFrame(frame)
    }
    const stopPan = attachPan(el, () => ({
      axis: 'y',
      touch: 'claim',
      canBegin: ({ target, pointerType }) => {
        stopFling()
        // A field keeps the mouse (text selection) and its own drags while focused; a finger
        // dragging across an unfocused field moves the sheet (a tap still focuses it), as in Maps.
        const field = target?.closest(EDITABLE)
        if (field && (pointerType === 'mouse' || field === document.activeElement)) return false
        return (
          live.current.open &&
          (pointerType !== 'mouse' || isChrome(target) || !!target?.closest('.lab-sheet-grabber'))
        )
      },
      shouldStart: ({ direction, target }) => {
        const L = live.current
        if (L.presentation === 'dialog') return direction === 1 && L.dismissible && isChrome(target)
        if (isChrome(target)) return true
        // A nested scroller or draggable control inside the content keeps its own gesture.
        if (gesture.current.resizable) return !canChildPan(target, scroller() ?? el, 'y', direction)
        if (direction === 1) return !canChildPan(target, el, 'y', 1)
        return visible.get() < Math.max(...L.heights) - 1
      },
      onStart: ({ pointerType }) => {
        dragging.current = true
        scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
        if (live.current.presentation === 'dialog') {
          lift.stop()
          start = lift.get()
          return
        }
        visible.stop()
        content = null
        start = visible.get()
        const target = lastTarget
        if (gesture.current.resizable && !isChrome(target) && pointerType !== 'mouse') {
          // Lay the content out at the height it shows, so its scroll range is the real one.
          if (motionHeight.current) rest(start)
          const max = gesture.current.maxHeight
          content = { state: { raw: start, scroll: scroller()?.scrollTop ?? 0 }, last: 0, scrollMax: scrollMaxAt(max) }
          if (start < max - 0.5) beginMotion()
          return
        }
        beginMotion()
      },
      onMove: ({ dy, time }) => {
        const L = live.current
        const move = dy / scale
        if (L.presentation === 'dialog') {
          const y = start + move
          lift.track(y < 0 ? -rubberBand(-y, 300) * 0.5 : y, time)
          return
        }
        const c = content
        if (c) {
          const max = gesture.current.maxHeight
          c.state = sheetScrollStep(c.state, -(move - c.last), max, c.scrollMax)
          c.last = move
          const atTop = Math.abs(c.state.raw - max) < 0.5
          // At its full height the sheet rests (exact layout) and only the content scrolls.
          if (atTop && motionHeight.current) rest(max)
          if (!atTop && !motionHeight.current) beginMotion()
          const v = scroller()
          if (v) v.scrollTop = c.state.scroll
          visible.track(dragHeight(c.state.raw, L.heights, L.metrics?.hostHeight ?? 800, L.dismissible), time)
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
        const c = content
        content = null
        const max = gesture.current.maxHeight
        if (c && c.state.raw >= max - 0.5 && !cancelled) {
          // At full height: settle any stretch, and let the content carry the flick.
          const speed = -vy / scale
          if (c.state.raw > max + 0.5) void moveTo(max, SPRINGS.release, visible.getVelocity(time))
          else if (motionHeight.current) rest(max)
          // It rests at its highest detent: report it.
          if (gesture.current.snap) setDetentRef.current(L.heights.indexOf(max))
          else settleFreeRef.current(max)
          const scroll = c.state.scroll
          if ((speed > 0 && scroll < c.scrollMax - 0.5) || (speed < 0 && scroll > 0.5)) flingContent(speed)
          return
        }
        releaseRef.current(visible.getVelocity(time), cancelled)
      },
    }))
    // The element the current pointer went down on (attachPan reports it to shouldStart only).
    let lastTarget: Element | null = null
    const remember = (event: Event) => {
      lastTarget = event.target instanceof Element ? event.target : null
    }
    el.addEventListener('pointerdown', remember, true)
    el.addEventListener('touchstart', remember, { capture: true, passive: true })

    // Wheel and trackpad: grow before scrolling down, shrink once scrolled back to the top, and on
    // a dismissible sheet go on below the lowest height until it closes. A snapping sheet settles
    // on a detent when the wheel stops.
    let idle = 0
    const settleWheel = () => {
      if (dragging.current || visible.isAnimating()) return
      const L = live.current
      const G = gesture.current
      const height = visible.get()
      if (height < G.minHeight - 0.5) {
        if (L.dismissible && wheelDismisses(height, G.minHeight)) return dismissAway(0)
        if (G.snap) setDetentRef.current(L.heights.indexOf(G.minHeight))
        else settleFreeRef.current(G.minHeight)
        void moveTo(G.minHeight, SPRINGS.release)
        return
      }
      if (G.snap) releaseRef.current(0, true)
      else {
        settleFreeRef.current(height)
        rest(height)
      }
    }
    const onWheel = (event: WheelEvent) => {
      const L = live.current
      const G = gesture.current
      const v = scroller()
      if (!v || !L.open || L.presentation === 'dialog' || event.ctrlKey || dragging.current) return
      const target = event.target instanceof Element ? event.target : null
      if (!target || target.closest(EDITABLE)) return
      const delta =
        (event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? v.clientHeight : 1)) / scaleOf(el)
      // A nested scroller inside the content keeps its own wheel.
      if (!delta || (v.contains(target) && canChildPan(target, v, 'y', delta > 0 ? -1 : 1))) return
      const height = visible.get()
      // A fixed sheet only moves to close.
      const grow = G.resizable && delta > 0 && height < G.maxHeight - 0.5
      const shrink =
        delta < 0 && v.scrollTop <= 0 && (L.dismissible ? height > 0.5 : G.resizable && height > G.minHeight + 0.5)
      if (!grow && !shrink) return
      event.preventDefault()
      stopFling()
      visible.stop()
      beginMotion()
      visible.set(wheelHeight(height, delta, G.minHeight, G.maxHeight, L.dismissible))
      window.clearTimeout(idle)
      idle = window.setTimeout(settleWheel, 160)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stopPan()
      stopFling()
      window.clearTimeout(idle)
      el.removeEventListener('pointerdown', remember, true)
      el.removeEventListener('touchstart', remember, { capture: true })
      el.removeEventListener('wheel', onWheel)
    }
    // A sheet open before its container exists gets its panel when the container arrives.
  }, [container])

  const cycle = (step: 1 | -1) => {
    const order = heights.map((h, i) => [h, i] as const).sort((a, b) => a[0] - b[0])
    const at = order.findIndex(([, i]) => i === index)
    const next = order[(at + step + order.length) % order.length][1]
    setDetentIndex(next)
  }
  /** Back down to where the page is usable, or closed. */
  const collapse = () => {
    const L = live.current
    if (L.undimmed !== null && backgroundInteraction !== undefined && heights[index] > L.undimmed + 0.5) {
      setDetentIndex(detents.indexOf(backgroundInteraction))
      return
    }
    if (dismissible) onOpenChange(false)
  }
  const sheetState = React.useMemo<SheetState>(
    () => ({
      detent: detents[index],
      expansion,
      height: visible,
      presentation,
      setDetent: (d) => {
        const i = detents.indexOf(d)
        if (i >= 0) setDetentRef.current(i)
      },
    }),
    [detents[index], presentation]
  )
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
      modal={hostModal}
      container={container}
      initialFocusRef={initialFocusRef ?? panel}
      returnFocusRef={returnFocusRef}
      onEscape={collapse}
    >
      {dims && <div ref={scrim} className="lab-sheet-scrim" aria-hidden="true" onClick={collapse} />}
      <div ref={probe} className="lab-sheet-safe-probe" aria-hidden="true" />
      <div ref={tokens} className="lab-sheet-token-probe" aria-hidden="true" />
      <div
        ref={panel}
        className={cn('lab-sheet', className)}
        data-presentation={presentation}
        data-mode={mode}
        data-detent={typeof detents[index] === 'string' ? detents[index] : undefined}
        data-ready={metrics ? '' : undefined}
        style={presentation === 'card' ? ({ '--lab-sheet-card-width': `${cardWidth}px` } as React.CSSProperties) : undefined}
        tabIndex={-1}
        onKeyDown={(event) => {
          // A non-modal host gets no cancel event: Escape still lowers or closes the sheet.
          if (event.key !== 'Escape' || hostModal || event.defaultPrevented) return
          event.preventDefault()
          event.stopPropagation()
          collapse()
        }}
        onFocus={(event) => {
          if (!(event.target instanceof Element) || !event.target.matches(EDITABLE)) return
          const next = focusRaise(detents, heights, index, focusDetent)
          if (next !== null) setDetentIndex(next)
        }}
      >
        <div ref={surface} className="lab-sheet-surface" aria-hidden="true">
          <div ref={solid} className="lab-sheet-solid" />
        </div>
        <div
          ref={column}
          className="lab-sheet-column"
          style={columnInset ? { insetInline: columnInset, bottom: columnInset } : undefined}
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
          <SheetContext.Provider value={sheetState}>
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
          </SheetContext.Provider>
        </div>
      </div>
    </PresentationHost>
  )
}
