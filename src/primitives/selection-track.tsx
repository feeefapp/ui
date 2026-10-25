'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { useMeasuredActions } from '../actions/use_measured_actions'
import { scheduleFitRows, useFitRow } from '../actions/fit-row'
import { useActionsWidth } from '../actions/width-context'
import { MenuSurface } from '../menu/menu-surface'
import { useFloatingBoundary } from '../menu/boundary'
import { cn } from '../utils'
import { scrollEdgeOpacities } from '../scroll/metrics'
import { revealScrollChild } from '../scroll/reveal'
import { GLASS_GLOW_START, GLASS_PRESS_SCALE, glassGlowRadius, pressedShape } from '../glass/press'
import { GLASS_FOLLOW_ATTRIBUTE } from '../glass/transitions'
import { useMotionValue, useReducedMotion } from '../physics/react'
import { SPRINGS, springTiming, type Spring } from '../physics/spring'
import {
  SEGMENTED_FADE,
  SEGMENTED_SLOP,
  segmentIndexAt,
  segmentedAutoScrollSpeed,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedSnapIndex,
  selectionKeyTarget,
  type SegmentSpan,
  type SelectionSemantics,
} from './segmented-model'
import { lensStretch } from './lens-model'
import type { SegmentOption } from './segmented'
import '../actions/actions.css'
import './lens.css'
import './segmented.css'

/**
 * The selection engine shared by `SegmentedControl` and `TabView`'s tab bar (Flutter twin:
 * `selection_track.dart`). Internal: apps use those two, which own the semantics and the look;
 * a third selection widget extends this instead of forking it.
 */

/** One option of a selection track: a segment, or a tab. */
export type SelectionOption<T extends string> = SegmentOption<T> & {
  /** The option element's id (a tab, which its panel is labelled by). */
  id?: string
  /** Id of the element the option controls (a tab's panel). */
  controls?: string
}

/** What chose an option: a click or tap (also Enter and Space), a released drag, or an arrow, Home or End key. */
export type SelectionSource = 'press' | 'drag' | 'key'

/** How an option lays out its content: icon, label and badge in a row (a segment), or the icon over
 * the label with the badge on the icon (a tab). */
export type SelectionLayout = 'inline' | 'stacked'

/** The pill at rest: the primary fill with on-primary ink (a segmented control), or a light primary
 * tint with the ink colour (a tab bar). Pressed or dragged, both become the same glass lens. */
export type SelectionPill = 'filled' | 'quiet'

/** What a track does when its options don't fit: scroll them inside itself, or fold into one
 * capsule (the selection and a chevron) that opens the options as a single-choice menu. */
export type SelectionOverflow = 'scroll' | 'menu'

/** A measured option, in the track's own (unscaled) pixels. */
type Box = { x: number; y: number; w: number; h: number; border: number }

/** How much the pressed or dragged pill (a water drop) magnifies the options under it. */
export const LENS_MAGNIFY = 0.18
type Drag = {
  pointer: number
  touch: boolean
  startX: number
  startY: number
  /** The latest pointer position (client px), for auto-scroll frames between moves. */
  clientX: number
  clientY: number
  /** Pressed on the pill itself (it lifts at once) rather than on another option. */
  onPill: boolean
  /** Pointer x less the pill centre when grabbed. */
  grab: number
  /** Past the slop: the pill follows the pointer. */
  active: boolean
  /** Pressed off the pill: it springs to the pointer before tracking it. */
  catching: boolean
  /** Reduced motion: the option under the pointer. */
  index: number
}

const COLLAPSE = springTiming(SPRINGS.snappy)

/**
 * One row of options and one moving pill: measuring, the pill and its glass lens with the touch
 * glow, drag with rubber band and momentum snap, auto-scroll, one-row overflow with edge fades and
 * reveal, keyboard roving, right-to-left, badges, tones, reduced motion and solid glass.
 *
 * `semantics` makes it a radio group (`radio`, `aria-checked`) or a tab list (`tab`, `aria-selected`
 * and `aria-controls`); `layout`, `pill` and the host's CSS (sizes) make it a segmented control or
 * a tab bar.
 * `overflow="menu"` folds it, when its row has no room (fitted with the row's other foldable
 * controls, `useFitRow`), into the selected option plus a chevron that opens a radio menu.
 */
export function SelectionTrack<const T extends string>({
  value,
  onSelect,
  options,
  label,
  semantics = 'radio',
  layout = 'inline',
  pill = 'filled',
  disabled = false,
  equalWidth = false,
  draggable = true,
  overflow: overflowMode = 'scroll',
  className,
}: {
  /** The selected option's value. */
  value: T
  /** Called with the chosen value and what chose it: on every press, when a dragged pill is
   * released on another option, and on every arrow, Home or End key. */
  onSelect(value: NoInfer<T>, source: SelectionSource): void
  /** Options, in display order. */
  options: readonly SelectionOption<T>[]
  /** Accessible name of the group. */
  label: string
  /** `radio`: a radio group (also Up and Down keys). `tab`: a tab list (Left and Right only). */
  semantics?: SelectionSemantics
  /** `inline` icon, label, badge; `stacked` icon (badge on it) over the label. */
  layout?: SelectionLayout
  /** The pill's rest paint. */
  pill?: SelectionPill
  /** Disables every option. */
  disabled?: boolean
  /** Fills the width with equal options that ellipsize (never scrolls). */
  equalWidth?: boolean
  /** False: presses select but never pick up the pill. */
  draggable?: boolean
  /** When the options don't fit: `scroll` inside the track, or `menu`: fold into the selection and
   * a chevron that opens the options as a menu (never with `equalWidth`). */
  overflow?: SelectionOverflow
  /** Class name for the group (sizes and a background). */
  className?: string
}) {
  const group = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  // Pill: centre, width and top; press response: swell, stretch, lens (0 filled … 1 glass), glow.
  const center = useMotionValue(0, 0.05)
  const width = useMotionValue(0, 0.05)
  const top = useMotionValue(0, 0.05)
  const press = useMotionValue(1, 0.0005)
  const stretch = useMotionValue(0, 0.05)
  const lens = useMotionValue(0, 0.002)
  const glowRadius = useMotionValue(GLASS_GLOW_START, 0.5)
  const glowOpacity = useMotionValue(0, 0.005)
  const layoutState = useRef({
    boxes: [] as Box[],
    spans: [] as SegmentSpan[],
    corner: 1,
    placed: false,
    /** The options are wider than the track: it scrolls. */
    overflow: false,
    rtl: false,
  })
  const glowAt = useRef({ x: 0, y: 0 })
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const autoFrame = useRef(0)
  /** The value last scrolled into view. */
  const revealed = useRef<T | undefined>(undefined)
  const menu = overflowMode === 'menu' && !equalWidth
  const [foldedState, setFolded] = useState(false)
  const folded = menu && foldedState
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuDir, setMenuDir] = useState<'ltr' | 'rtl'>('ltr')
  const [menuContainer, setMenuContainer] = useState<HTMLElement | null>()
  const boundary = useFloatingBoundary()
  const measuringRow = useRef<HTMLDivElement>(null)
  /** Focus follows the selection onto the capsule after a key changed it while folded. */
  const refocus = useRef(false)
  const live = useRef({ value, options, disabled, reduced, onSelect, equalWidth, draggable, folded })
  live.current = { value, options, disabled, reduced, onSelect, equalWidth, draggable, folded }

  const tab = semantics === 'tab'
  const stacked = layout === 'stacked'
  const enabled = options.filter((option) => !disabled && !option.disabled)
  const tabValue = enabled.some((option) => option.value === value) ? value : enabled[0]?.value
  const optionKey = options
    .map((option) => `${option.value}:${option.label}:${option.badge ?? ''}:${option.disabled ? 1 : 0}`)
    .join('|')

  const buttons = () =>
    trackRef.current ? [...trackRef.current.querySelectorAll<HTMLElement>(':scope > .lab-segmented-option')] : []

  /** Client point → the track's own pixels (undoes scaled ancestors, like a pressed bubble, and the
   * scroll: the track moves with it). */
  const local = (clientX: number, clientY: number) => {
    const el = trackRef.current!
    const rect = el.getBoundingClientRect()
    const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
  }

  /** Edge fades of a scrolling track: each edge fades in as content moves past it. */
  const fade = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (!layoutState.current.overflow) {
      scroller.style.removeProperty('--lab-segmented-fade-left')
      scroller.style.removeProperty('--lab-segmented-fade-right')
      return
    }
    const max = scroller.scrollWidth - scroller.clientWidth
    // Right-to-left scrollers run from -max (far left) to 0.
    const left = layoutState.current.rtl ? max + scroller.scrollLeft : scroller.scrollLeft
    const edges = scrollEdgeOpacities(left, max, SEGMENTED_FADE)
    scroller.style.setProperty('--lab-segmented-fade-left', String(edges.top))
    scroller.style.setProperty('--lab-segmented-fade-right', String(edges.bottom))
  }

  /** Scrolls the track (never the page) to show option `index` clear of the edge fades. */
  const reveal = (index: number, behavior: ScrollBehavior) => {
    if (!layoutState.current.overflow) return
    revealScrollChild(scrollerRef.current, buttons()[index], { block: false, behavior })
  }

  const measure = () => {
    const root = group.current
    const el = trackRef.current
    const scroller = scrollerRef.current
    if (!root || !el || !scroller) return
    const rect = el.getBoundingClientRect()
    const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1
    const { options, disabled, equalWidth } = live.current
    const boxes = buttons().map((button) => {
      const r = button.getBoundingClientRect()
      return {
        x: (r.left - rect.left) / scale,
        y: (r.top - rect.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
        border: button.clientLeft,
      }
    })
    const state = layoutState.current
    state.boxes = boxes
    state.spans = boxes.map((box, i) => ({
      start: box.x,
      width: box.w,
      disabled: disabled || !!options[i]?.disabled,
    }))
    const style = getComputedStyle(root)
    state.corner = parseFloat(style.getPropertyValue('--lab-corner-scale')) || 1
    state.rtl = style.direction === 'rtl'
    const overflow = !equalWidth && overflowMode !== 'menu' && scroller.scrollWidth - scroller.clientWidth > 0.5
    const changed = overflow !== state.overflow
    state.overflow = overflow
    root.toggleAttribute('data-overflow', overflow)
    fade()
    return changed
  }

  const paint = () => {
    const el = group.current
    const pillEl = pillRef.current
    const { boxes, corner } = layoutState.current
    if (!el || !pillEl || !boxes.length) return
    const height = boxes[0].h
    const w = width.get()
    const scale = press.get()
    const shape = pressedShape(
      { x: center.get() - w / 2, y: top.get(), width: w, height, radius: 0 },
      scale,
      stretch.get(),
      0
    )
    pillEl.style.transform = `translate(${shape.x}px, ${shape.y}px)`
    pillEl.style.width = `${shape.width}px`
    pillEl.style.height = `${shape.height}px`
    el.style.setProperty('--lab-segmented-press', String(scale))
    el.style.setProperty('--lab-lens', String(Math.max(0, Math.min(1, lens.get()))))
    el.style.setProperty('--lab-lens-glow-x', `${glowAt.current.x - shape.x}px`)
    el.style.setProperty('--lab-lens-glow-y', `${glowAt.current.y - shape.y}px`)
    el.style.setProperty('--lab-lens-glow-r', `${Math.max(1, glowRadius.get())}px`)
    el.style.setProperty('--lab-lens-glow', String(Math.max(0, Math.min(1, glowOpacity.get()))))
    // Selected ink shows exactly where the pill is, so a label turns over as the pill crosses it.
    // Pressed or dragged, the pill is a water drop that magnifies what is under it: the ink copy
    // scales up around the drop's centre (its clip mapped back so it still fills the drop), and
    // the plain content underneath is cut out where the drop is.
    const lensAmount = Math.max(0, Math.min(1, lens.get()))
    const zoom = 1 + LENS_MAGNIFY * lensAmount
    const radius = (Math.min(shape.width, shape.height) / 2) * corner
    buttons().forEach((button, i) => {
      const box = boxes[i]
      if (!box) return
      const b = box.border
      const innerW = box.w - 2 * b
      const innerH = box.h - 2 * b
      // The drop in the option's padding box, then where the scaled ink copy must be cut.
      const local = { x: shape.x - (box.x + b), y: shape.y - (box.y + b), w: shape.width, h: shape.height }
      const ox = local.x + local.w / 2
      const oy = local.y + local.h / 2
      const cut = { x: ox + (local.x - ox) / zoom, y: oy + (local.y - oy) / zoom, w: local.w / zoom, h: local.h / zoom }
      const inset = [cut.y, innerW - (cut.x + cut.w), innerH - (cut.y + cut.h), cut.x].map((v) => `${Math.max(0, v)}px`)
      button.style.setProperty('--lab-segmented-clip', `inset(${inset.join(' ')} round ${radius / zoom}px)`)
      button.style.setProperty('--lab-segmented-lens-at', `${ox}px ${oy}px`)
      button.style.setProperty('--lab-segmented-zoom', String(zoom))
      const plain = button.firstElementChild as HTMLElement | null
      if (!plain) return
      const crosses = lensAmount > 0.01 && local.x < innerW && local.x + local.w > 0
      plain.style.maskImage = crosses
        ? `radial-gradient(ellipse ${local.w / 2}px ${local.h / 2}px at ${ox - plain.offsetLeft}px ${oy - plain.offsetTop}px, transparent 94%, #000 100%)`
        : ''
    })
  }

  useLayoutEffect(() => {
    const values = [center, width, top, press, stretch, lens, glowRadius, glowOpacity]
    const off = values.map((motion) => motion.subscribe(paint))
    // While dragged, the width follows the centre: one option's width to the next.
    off.push(
      center.subscribe((c) => {
        if (drag.current?.active) width.set(segmentedPillWidth(c, layoutState.current.spans))
      })
    )
    return () => off.forEach((unsubscribe) => unsubscribe())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedIndex = () => live.current.options.findIndex((option) => option.value === live.current.value)

  /** Springs (or, with reduced motion or before the first placement, jumps) the pill onto `index`. */
  const moveTo = (index: number, spring: Spring) => {
    const box = layoutState.current.boxes[index]
    const pillEl = pillRef.current
    if (!box || !pillEl) {
      pillEl?.setAttribute('data-hidden', '')
      return
    }
    pillEl.removeAttribute('data-hidden')
    const instant = live.current.reduced || !layoutState.current.placed
    layoutState.current.placed = true
    void center.animateTo(box.x + box.w / 2, { spring, instant })
    void width.animateTo(box.w, { spring, instant })
    void top.animateTo(box.y, { spring, instant })
    paint()
  }

  // Follow the selection and the layout (option text, density, container width).
  const selected = options.findIndex((option) => option.value === value)
  useLayoutEffect(() => {
    measure()
    if (drag.current?.active) return
    // Whatever chose it (a press, a key, a release, the owner), a new selection scrolls into view;
    // new labels or counts leave the scroll where the person put it.
    if (revealed.current !== value) {
      revealed.current = value
      reveal(selected, layoutState.current.placed ? 'smooth' : 'instant')
    }
    const box = layoutState.current.boxes[selected]
    // A released pill already heading here keeps its release spring.
    if (box && center.isAnimating() && Math.abs(center.getTarget() - (box.x + box.w / 2)) < 0.5) return
    moveTo(selected, SPRINGS.snappy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, optionKey, equalWidth, disabled, reduced])

  useLayoutEffect(() => {
    const el = group.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const overflowChanged = measure()
      if (drag.current?.active) return
      const index = selectedIndex()
      if (overflowChanged) reveal(index, 'instant')
      if (center.isAnimating()) moveTo(index, SPRINGS.snappy)
      else {
        // At rest: snap to the new geometry without animating a resize (a folding track's options
        // spring their own widths; the pill follows them frame by frame).
        const box = layoutState.current.boxes[index]
        if (!box) return moveTo(index, SPRINGS.snappy)
        center.set(box.x + box.w / 2)
        width.set(box.w)
        top.set(box.y)
      }
    })
    observer.observe(el)
    if (trackRef.current) observer.observe(trackRef.current)
    for (const button of buttons()) observer.observe(button)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionKey])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.addEventListener('scroll', fade, { passive: true })
    return () => scroller.removeEventListener('scroll', fade)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pressIn = (point: { x: number; y: number }) => {
    if (live.current.reduced) return
    group.current?.setAttribute('data-pressed', '')
    glowAt.current = point
    void press.animateTo(GLASS_PRESS_SCALE, { spring: SPRINGS.snappy })
    void lens.animateTo(1, { spring: SPRINGS.snappy })
    glowRadius.set(GLASS_GLOW_START)
    glowOpacity.set(1)
    void glowRadius.animateTo(glassGlowRadius(width.get()), { spring: SPRINGS.smooth })
  }
  const pressOut = () => {
    group.current?.removeAttribute('data-pressed')
    void press.animateTo(1, { spring: SPRINGS.bouncy })
    void stretch.animateTo(0, { spring: SPRINGS.bouncy })
    void lens.animateTo(0, { spring: SPRINGS.snappy })
    void glowOpacity.animateTo(0, { spring: SPRINGS.smooth })
  }

  /** Reports a released choice; if the owner keeps the old value, the pill goes back to it. */
  const commit = (index: number) => {
    const option = live.current.options[index]
    if (!option || option.value === live.current.value) return
    live.current.onSelect(option.value, 'drag')
    requestAnimationFrame(() => {
      if (!drag.current && live.current.value !== option.value) moveTo(selectedIndex(), SPRINGS.snappy)
    })
  }

  const detach = useRef<() => void>(() => {})
  useEffect(
    () => () => {
      detach.current()
      cancelAnimationFrame(autoFrame.current)
    },
    []
  )

  /** Moves a dragged pill to the pointer. `auto`: an auto-scroll frame moved the track under a
   * still pointer, so the pill springs after it instead of tracking pointer samples. */
  const follow = (d: Drag, time: number, auto: boolean) => {
    const point = local(d.clientX, d.clientY)
    const { spans, boxes } = layoutState.current
    if (live.current.reduced) {
      // No sliding: the pill sits on the option under the pointer.
      const index = segmentIndexAt(point.x, spans)
      if (index >= 0 && !spans[index].disabled && index !== d.index) {
        d.index = index
        center.set(boxes[index].x + boxes[index].w / 2)
        width.set(boxes[index].w)
      }
      return
    }
    glowAt.current = point
    const target = segmentedDragCenter(point.x, d.grab, spans)
    if (d.catching || auto) {
      void center.animateTo(target, { spring: SPRINGS.interactive })
      if (d.catching && Math.abs(center.get() - target) < 1) d.catching = false
    } else center.track(target, time)
    void stretch.animateTo(lensStretch(center.getVelocity(time)), { spring: SPRINGS.interactive })
    paint()
  }

  /** While a pill is dragged, a pointer near an edge of a scrolling track scrolls it. */
  const autoScroll = () => {
    if (autoFrame.current) return
    let last = performance.now()
    const frame = (now: number) => {
      const d = drag.current
      const scroller = scrollerRef.current
      if (!d?.active || !scroller) {
        autoFrame.current = 0
        return
      }
      autoFrame.current = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      if (!layoutState.current.overflow) return
      const rect = scroller.getBoundingClientRect()
      const scale = scroller.offsetWidth ? rect.width / scroller.offsetWidth : 1
      const speed = segmentedAutoScrollSpeed((d.clientX - rect.left) / scale, 0, scroller.clientWidth)
      if (!speed) return
      const before = scroller.scrollLeft
      scroller.scrollLeft = before + speed * dt
      if (scroller.scrollLeft !== before) follow(d, now, true)
    }
    autoFrame.current = requestAnimationFrame(frame)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (live.current.disabled || !live.current.draggable || live.current.folded || event.button > 0 || drag.current || !group.current)
      return
    measure()
    const { spans, boxes, overflow } = layoutState.current
    if (!boxes.length) return
    const point = local(event.clientX, event.clientY)
    const index = segmentIndexAt(point.x, spans)
    if (index < 0 || spans[index].disabled) return
    const onPill = index === selectedIndex() && !center.isAnimating()
    const touch = event.pointerType === 'touch'
    // A finger off the pill in a scrolling track scrolls it (a tap still selects).
    if (overflow && touch && !onPill) return
    drag.current = {
      pointer: event.pointerId,
      touch,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      onPill,
      grab: onPill ? point.x - center.get() : 0,
      active: false,
      catching: !onPill,
      index,
    }
    if (onPill) pressIn(point)
    const move = (e: globalThis.PointerEvent) => onPointerMove(e)
    const up = (e: globalThis.PointerEvent) => onPointerEnd(e, false)
    const cancel = (e: globalThis.PointerEvent) => onPointerEnd(e, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    detach.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      detach.current = () => {}
    }
  }

  const onPointerMove = (event: globalThis.PointerEvent) => {
    const d = drag.current
    if (!d || event.pointerId !== d.pointer || !group.current) return
    const dx = event.clientX - d.startX
    const dy = event.clientY - d.startY
    d.clientX = event.clientX
    d.clientY = event.clientY
    if (!d.active) {
      if (Math.abs(dx) < (d.touch ? SEGMENTED_SLOP.touch : SEGMENTED_SLOP.mouse) || Math.abs(dx) < Math.abs(dy)) return
      d.active = true
      group.current.setAttribute('data-dragging', '')
      if (!d.onPill) pressIn(local(event.clientX, event.clientY))
      autoScroll()
    }
    event.preventDefault()
    follow(d, event.timeStamp, false)
  }

  const onPointerEnd = (event: globalThis.PointerEvent, cancelled: boolean) => {
    const d = drag.current
    if (!d || event.pointerId !== d.pointer) return
    detach.current()
    drag.current = null
    cancelAnimationFrame(autoFrame.current)
    autoFrame.current = 0
    group.current?.removeAttribute('data-dragging')
    pressOut()
    if (!d.active) return
    // The click that ends a drag is not a press.
    suppressClick.current = true
    setTimeout(() => (suppressClick.current = false), 0)
    const { spans } = layoutState.current
    const index = cancelled
      ? selectedIndex()
      : live.current.reduced
        ? d.index
        : segmentedSnapIndex(center.get(), center.getVelocity(event.timeStamp), spans)
    const target = index >= 0 ? index : selectedIndex()
    moveTo(target, SPRINGS.release)
    if (!cancelled) commit(target)
  }

  const openMenu = () => {
    if (!group.current) return
    setMenuDir(getComputedStyle(group.current).direction === 'rtl' ? 'rtl' : 'ltr')
    setMenuOpen(true)
  }

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = !!group.current && getComputedStyle(group.current).direction === 'rtl'
    const index = enabled.findIndex((option) => option.value === value)
    // Folded: Up and Down open the menu (a pop-up button); Left, Right, Home and End still step
    // through the options without opening it.
    if (folded && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      openMenu()
      return
    }
    const target = selectionKeyTarget(event.key, index, enabled.length, rtl, folded ? 'tab' : semantics)
    if (target === null) return
    event.preventDefault()
    const next = enabled[target]
    if (folded) {
      refocus.current = true
      onSelect(next.value, 'key')
      return
    }
    onSelect(next.value, 'key')
    const position = options.findIndex((option) => option.value === next.value)
    const button = buttons()[position]
    // The track scrolls the option into view as the selection follows (see above); an enclosing
    // scroll area shows the track.
    button?.focus({ preventScroll: true })
    revealScrollChild(group.current?.closest<HTMLElement>('.lab-scroll-viewport'), button, {
      inline: false,
    })
  }

  // Folding into a menu: hidden copies of the options give the unfolded and folded widths, and
  // the row (with its other foldable controls) decides when there is no room.
  const { measurements } = useMeasuredActions(group, measuringRow, `${optionKey}|${menu}`)
  // Inside a Dock the parent says how much it can give (like ActionsBar); elsewhere the row decides.
  const room = useActionsWidth()
  useFitRow(group, menu, {
    room,
    widths: () => {
      const scroller = scrollerRef.current
      const row = measuringRow.current
      if (!measurements || !scroller || !row) return null
      const list = live.current.options
      const widths = list.map((option) => measurements.widths.get(option.value) ?? 0)
      if (!widths.length || widths.some((width) => !width)) return null
      const style = getComputedStyle(scroller)
      const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0
      const index = Math.max(0, list.findIndex((option) => option.value === live.current.value))
      return {
        full: widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1) + inset,
        compact: widths[index] + measurements.overflowWidth + inset,
      }
    },
    fold: (next) => {
      setFolded(next)
      if (!next) setMenuOpen(false)
    },
  })
  useEffect(() => {
    if (menu) scheduleFitRows()
  }, [menu, measurements, value, room])
  // While it folds or unfolds, the bubble around it follows its size instead of springing after it.
  const foldedBefore = useRef(folded)
  useLayoutEffect(() => {
    const root = group.current
    if (!root || foldedBefore.current === folded) return
    foldedBefore.current = folded
    root.setAttribute(GLASS_FOLLOW_ATTRIBUTE, '')
    const timer = setTimeout(() => root.removeAttribute(GLASS_FOLLOW_ATTRIBUTE), COLLAPSE.duration + 50)
    return () => {
      clearTimeout(timer)
      root.removeAttribute(GLASS_FOLLOW_ATTRIBUTE)
    }
  }, [folded])
  useLayoutEffect(() => {
    if (menu) setMenuContainer(group.current?.closest('dialog') ?? boundary)
  }, [menu, boundary])
  // The menu opens on the chosen option, like a pop-up button (Radix focuses the first one).
  const menuContent = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen || !folded) return
    const frame = requestAnimationFrame(() =>
      menuContent.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
        ?.focus({ preventScroll: true })
    )
    return () => cancelAnimationFrame(frame)
  }, [menuOpen, folded])
  useLayoutEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    buttons()[selected]?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // Stacked, the badge sits on the icon (or after a label with no icon). The selected option of a
  // track that can fold into a menu carries the chevron (shown only while folded).
  const renderContent = (option: SelectionOption<T>, chevron: boolean): ReactNode => {
    const badgeOnIcon = stacked && !!option.icon
    const badge = option.badge ? <span className="lab-segmented-badge">{option.badge}</span> : null
    return (
      <>
        {option.icon && (
          <span className="lab-segmented-icon" data-tone={option.tone} aria-hidden="true">
            {option.icon}
            {badgeOnIcon && badge}
          </span>
        )}
        <span className="lab-segmented-label">{option.label}</span>
        {!badgeOnIcon && badge}
        {chevron && (
          <span className="lab-segmented-chevron" aria-hidden="true">
            <ChevronDown />
          </span>
        )}
      </>
    )
  }
  return (
    <div
      ref={group}
      className={cn('lab-segmented', className)}
      data-equal-width={equalWidth || undefined}
      data-layout={layout}
      data-pill={pill}
      data-overflow-mode={menu ? 'menu' : undefined}
      data-menu-folded={folded || undefined}
      // A press here lifts the pill, not the glass bubble around the track.
      data-glass-own-press=""
      // Folded, the capsule is a pop-up button; the radios live in its menu.
      role={folded ? 'group' : tab ? 'tablist' : 'radiogroup'}
      aria-label={label}
      aria-disabled={disabled || undefined}
      style={
        menu
          ? ({
              '--lab-segmented-fold-ease': COLLAPSE.easing,
              '--lab-segmented-fold-duration': `${COLLAPSE.duration}ms`,
            } as CSSProperties)
          : undefined
      }
      onKeyDown={navigate}
      onPointerDown={onPointerDown}
      onClickCapture={(event) => {
        if (!suppressClick.current) return
        event.preventDefault()
        event.stopPropagation()
      }}
      data-lab-corners
    >
      {/* Scrolls when the options don't fit; the track holds the options and the pill. */}
      <div ref={scrollerRef} className="lab-segmented-scroller">
        <div ref={trackRef} className="lab-segmented-track">
          <span ref={pillRef} className="lab-segmented-pill" aria-hidden="true" data-hidden="">
            <span className="lab-segmented-fill" />
            <span className="lab-lens lab-light-edge" />
            <span className="lab-lens-glow" />
          </span>
          {options.map((option) => {
            const isSelected = option.value === value
            const content = renderContent(option, menu && isSelected)
            // Folded: the selected option is the capsule that opens the menu; the rest fold away.
            const trigger = folded && isSelected
            const name = option.badge ? `${option.label}, ${option.badge}` : undefined
            return (
              <Button
                key={option.value}
                id={option.id}
                variant="ghost"
                appearance="toolbar"
                controlSize="regular"
                className="lab-segmented-option"
                role={trigger ? undefined : tab ? 'tab' : 'radio'}
                aria-checked={tab || trigger ? undefined : isSelected}
                aria-selected={tab && !trigger ? isSelected : undefined}
                aria-controls={trigger ? undefined : option.controls}
                aria-haspopup={trigger ? 'menu' : undefined}
                aria-expanded={trigger ? menuOpen : undefined}
                aria-label={trigger ? `${label}: ${name ?? option.label}` : name}
                data-selected={isSelected || undefined}
                // Folding springs max-width from the option's own width, never from a far cap.
                style={
                  menu && measurements?.widths.get(option.value)
                    ? ({ '--lab-segmented-natural': `${measurements.widths.get(option.value)}px` } as CSSProperties)
                    : undefined
                }
                inert={folded && !isSelected ? true : undefined}
                tabIndex={folded ? (isSelected ? 0 : -1) : option.value === tabValue ? 0 : -1}
                disabled={disabled || option.disabled}
                onClick={() => (trigger ? openMenu() : onSelect(option.value, 'press'))}
              >
                <span className="lab-segmented-content">{content}</span>
                {/* The selected ink, cut to the pill's shape as it passes. */}
                <span className="lab-segmented-content lab-segmented-ink" aria-hidden="true">
                  {content}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
      {menu && (
        <>
          {/* Real options, inert and hidden, keep font/zoom measurement exact (like ActionsBar). */}
          <div className="lab-segmented-measure" aria-hidden="true" inert>
            <div ref={measuringRow} className="lab-segmented-track">
              {options.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  appearance="toolbar"
                  controlSize="regular"
                  className="lab-segmented-option"
                  tabIndex={-1}
                  data-lab-action-id={option.value}
                >
                  <span className="lab-segmented-content">{renderContent(option, false)}</span>
                </Button>
              ))}
              <span className="lab-segmented-chevron" data-lab-overflow-measure="">
                <ChevronDown />
              </span>
            </div>
          </div>
          <DropdownMenu.Root modal={false} open={folded && menuOpen} onOpenChange={setMenuOpen} dir={menuDir}>
            {/* The menu grows out of the whole capsule. */}
            <DropdownMenu.Trigger asChild>
              <span className="lab-segmented-menu-anchor" aria-hidden="true" tabIndex={-1} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal container={menuContainer}>
              <MenuSurface asChild>
                <DropdownMenu.Content
                  className="lab-actions-menu lab-segmented-menu"
                  aria-label={label}
                  {...(menuContainer ? { collisionBoundary: menuContainer } : {})}
                  ref={menuContent}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    buttons()[selectedIndex()]?.focus({ preventScroll: true })
                  }}
                >
                  <DropdownMenu.RadioGroup value={value} onValueChange={(next) => onSelect(next as T, 'press')}>
                    {options.map((option) => (
                      <DropdownMenu.RadioItem
                        key={option.value}
                        value={option.value}
                        disabled={disabled || option.disabled}
                        className="lab-actions-menu__item"
                        data-lab-corners
                        textValue={option.label}
                      >
                        <span className="lab-actions-menu__leading" aria-hidden="true">
                          <DropdownMenu.ItemIndicator>
                            <Check size={18} />
                          </DropdownMenu.ItemIndicator>
                        </span>
                        {option.icon && (
                          <span className="lab-segmented-icon" data-tone={option.tone} aria-hidden="true">
                            {option.icon}
                          </span>
                        )}
                        <span className="lab-actions-menu__label">{option.label}</span>
                        {option.badge && <span className="lab-segmented-badge">{option.badge}</span>}
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
              </MenuSurface>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </>
      )}
    </div>
  )
}
