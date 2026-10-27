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
  focusRaise,
  releaseTarget,
  sheetDim,
  sheetFrame,
  sheetMorphFrame,
  sheetRecede,
  type SheetDetent,
  type SheetFrame,
  type SheetRect,
} from './sheet-model'
import { cn } from '../utils'
import { GLASS_INSTANT_ATTRIBUTE, settleGlass } from '../glass/transitions'
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
  /** Whether dragging down, the scrim and Escape close it. Default true. The close bubble always does. */
  dismissible?: boolean
  /** Shows the grabber. Default: when there is more than one detent. */
  grabber?: boolean
  /**
   * `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet at
   * every height, with no scrim and no Escape dismissal.
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
   * or a floating glass `card` at the leading edge with the same detents (iPad Maps).
   */
  regular?: 'dialog' | 'sheet' | 'card'
  /** Width in px from which the sheet is “regular” (wide). Default 720. */
  regularBreakpoint?: number
  /** Width of the `card` presentation in px. Default 380. */
  cardWidth?: number
  /** Renders inside this element (absolutely positioned) instead of the top layer: for embedded previews. */
  container?: HTMLElement | null
  /** On phones, let the page behind recede (scale back) as a large modal sheet rises. Default true. */
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

/** What content inside a sheet can read: where it rests and how far it is expanded. */
export type SheetState = {
  /** The detent the sheet rests at (it changes when a drag or a tap settles). */
  detent: SheetDetent
  /** 0 at the lowest partial height … 1 at full height, every frame (subscribe to paint with it). */
  expansion: MotionValue
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
/** The sheet growing out of its source, and flying back into it. */
const MORPH_OPEN: Spring = { duration: 0.46, bounce: 0.16 }
const MORPH_CLOSE: Spring = { duration: 0.36, bounce: 0.08 }

/**
 * A sheet that rises from the bottom, like iOS 26/27: it rests at detents (just its header, half,
 * full, fit or custom heights), follows the finger, snaps where a flick projects and closes when
 * flicked down. Below full height it floats inset from the edges on glass; rising, it reaches the
 * edges and turns opaque in one continuous motion. It can grow out of the button that opened it,
 * leave the page usable at low detents, and becomes a dialog or a floating card on wide screens.
 */
export function Sheet(props: SheetProps) {
  const { mounted, exited } = usePresented(props.open)
  if (!mounted) return null
  return <SheetPresentation {...props} onExited={exited} />
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
  const presentation: 'sheet' | 'card' | 'dialog' = wide && regular !== 'sheet' ? regular : 'sheet'
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
    if (controlledDetent === undefined) setLocalIndex(next)
    if (next !== live.current.index) onDetentChange?.(detents[next])
  }
  const setDetentRef = React.useRef(setDetentIndex)
  setDetentRef.current = setDetentIndex

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
        live.current.open &&
        !target?.closest(EDITABLE) &&
        (pointerType !== 'mouse' || isChrome(target) || !!target?.closest('.lab-sheet-grabber')),
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
          draggedAway.current = true
          void visible.animateTo(0, { spring: SPRINGS.smooth, velocity })
          L.onOpenChange(false)
          // A host that keeps the sheet open gets it back at its detent.
          window.setTimeout(() => {
            draggedAway.current = false
            if (live.current.open && !visible.isAnimating()) void moveTo(live.current.heights[live.current.index] ?? 0)
          }, 400)
          return
        }
        const next = landing.dismiss ? L.index : landing.index
        setDetentRef.current(next)
        void moveTo(L.heights[next] ?? landing.height, SPRINGS.release, velocity)
      },
    }))
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
