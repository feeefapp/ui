'use client'

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Button } from './button'
import { cn } from '../utils'
import { scrollEdgeOpacities } from '../scroll/metrics'
import { revealScrollChild } from '../scroll/reveal'
import { GLASS_GLOW_START, GLASS_PRESS_SCALE, glassGlowRadius, pressedShape } from '../glass/press'
import { useMotionValue, useReducedMotion } from '../physics/react'
import { SPRINGS, type Spring } from '../physics/spring'
import {
  SEGMENTED_FADE,
  SEGMENTED_SLOP,
  segmentIndexAt,
  segmentedAutoScrollSpeed,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedSnapIndex,
  type SegmentSpan,
} from './segmented-model'
import { lensStretch } from './lens-model'
import './lens.css'
import './segmented.css'

/** A status colour for an option's icon. */
export type SegmentTone = 'success' | 'warning' | 'danger'

/** One choice of a segmented control. */
export type SegmentOption<T extends string> = {
  /** Value reported to `onChange`. */
  value: T
  /** Visible text and accessible name. */
  label: string
  /** Decorative icon before the label. */
  icon?: ReactNode
  /** Colours the icon (only the icon) with a status token while the option isn't selected; the
   * selected option's icon takes the pill's ink. Never the only cue: keep it in the label too. */
  tone?: SegmentTone
  /** A short count or tag after the label ("21"), on a small neutral pill in tabular figures. It is
   * part of the option's accessible name ("New, 21"). */
  badge?: string
  /** Skipped by the keyboard and not clickable. */
  disabled?: boolean
}

/** A measured option, in the control's own (unscaled) pixels. */
type Box = { x: number; y: number; w: number; h: number; border: number }
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

/**
 * A single choice among short options, shown side by side in one row. A filled pill marks the
 * selection and slides to the next one; press it and it becomes a glass lens you can drag (or
 * press another option and drag: the pill comes to you). Radio semantics: one Tab stop, arrow keys
 * move and select. Options can carry a count (`badge`).
 *
 * Options that don't fit scroll sideways inside the control (never wrap or squeeze): its edges fade
 * where there is more, the selection scrolls into view whenever it changes, and a pill dragged near
 * an edge scrolls on. On touch a swipe scrolls; a drag that starts on the pill moves the pill.
 *
 * It paints no container: put it in glass (`ToolbarGroup`), on a box of your own (a surface-token
 * background; the root already has the capsule radius) or leave it bare.
 */
export function SegmentedControl<const T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  equalWidth = false,
  className,
}: {
  /** The selected option's value. */
  value: T
  /** Called with the chosen value on a click or tap, when a dragged pill is released on another option, and on every arrow, Home or End key press. */
  onChange(value: NoInfer<T>): void
  /** Choices, in display order. */
  options: readonly SegmentOption<T>[]
  /** Accessible name of the radio group. */
  label: string
  /** Disables every option. */
  disabled?: boolean
  /** Fills the available width with one row of equal options whose labels end in an ellipsis (it
   * never scrolls). */
  equalWidth?: boolean
  /** Class name for the group (a background here fills the capsule behind the options). */
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
  const layout = useRef({
    boxes: [] as Box[],
    spans: [] as SegmentSpan[],
    corner: 1,
    placed: false,
    /** The options are wider than the control: it scrolls. */
    overflow: false,
    rtl: false,
  })
  const glowAt = useRef({ x: 0, y: 0 })
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const autoFrame = useRef(0)
  /** The value last scrolled into view. */
  const revealed = useRef<T | undefined>(undefined)
  const live = useRef({ value, options, disabled, reduced, onChange, equalWidth })
  live.current = { value, options, disabled, reduced, onChange, equalWidth }

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

  /** Edge fades of a scrolling control: each edge fades in as content moves past it. */
  const fade = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (!layout.current.overflow) {
      scroller.style.removeProperty('--lab-segmented-fade-left')
      scroller.style.removeProperty('--lab-segmented-fade-right')
      return
    }
    const max = scroller.scrollWidth - scroller.clientWidth
    // Right-to-left scrollers run from -max (far left) to 0.
    const left = layout.current.rtl ? max + scroller.scrollLeft : scroller.scrollLeft
    const edges = scrollEdgeOpacities(left, max, SEGMENTED_FADE)
    scroller.style.setProperty('--lab-segmented-fade-left', String(edges.top))
    scroller.style.setProperty('--lab-segmented-fade-right', String(edges.bottom))
  }

  /** Scrolls the control (never the page) to show option `index` clear of the edge fades. */
  const reveal = (index: number, behavior: ScrollBehavior) => {
    if (!layout.current.overflow) return
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
    const state = layout.current
    state.boxes = boxes
    state.spans = boxes.map((box, i) => ({
      start: box.x,
      width: box.w,
      disabled: disabled || !!options[i]?.disabled,
    }))
    const style = getComputedStyle(root)
    state.corner = parseFloat(style.getPropertyValue('--lab-corner-scale')) || 1
    state.rtl = style.direction === 'rtl'
    const overflow = !equalWidth && scroller.scrollWidth - scroller.clientWidth > 0.5
    const changed = overflow !== state.overflow
    state.overflow = overflow
    root.toggleAttribute('data-overflow', overflow)
    fade()
    return changed
  }

  const paint = () => {
    const el = group.current
    const pill = pillRef.current
    const { boxes, corner } = layout.current
    if (!el || !pill || !boxes.length) return
    const height = boxes[0].h
    const w = width.get()
    const scale = press.get()
    const shape = pressedShape(
      { x: center.get() - w / 2, y: top.get(), width: w, height, radius: 0 },
      scale,
      stretch.get(),
      0
    )
    pill.style.transform = `translate(${shape.x}px, ${shape.y}px)`
    pill.style.width = `${shape.width}px`
    pill.style.height = `${shape.height}px`
    el.style.setProperty('--lab-segmented-press', String(scale))
    el.style.setProperty('--lab-lens', String(Math.max(0, Math.min(1, lens.get()))))
    el.style.setProperty('--lab-lens-glow-x', `${glowAt.current.x - shape.x}px`)
    el.style.setProperty('--lab-lens-glow-y', `${glowAt.current.y - shape.y}px`)
    el.style.setProperty('--lab-lens-glow-r', `${Math.max(1, glowRadius.get())}px`)
    el.style.setProperty('--lab-lens-glow', String(Math.max(0, Math.min(1, glowOpacity.get()))))
    // Selected ink shows exactly where the pill is, so a label turns over as the pill crosses it.
    const radius = (Math.min(shape.width, shape.height) / 2) * corner
    buttons().forEach((button, i) => {
      const box = boxes[i]
      if (!box) return
      const b = box.border
      const inset = [
        shape.y - (box.y + b),
        box.x + box.w - b - (shape.x + shape.width),
        box.y + box.h - b - (shape.y + shape.height),
        shape.x - (box.x + b),
      ].map((v) => `${Math.max(0, v)}px`)
      button.style.setProperty('--lab-segmented-clip', `inset(${inset.join(' ')} round ${radius}px)`)
    })
  }

  useLayoutEffect(() => {
    const values = [center, width, top, press, stretch, lens, glowRadius, glowOpacity]
    const off = values.map((motion) => motion.subscribe(paint))
    // While dragged, the width follows the centre: one segment's width to the next.
    off.push(
      center.subscribe((c) => {
        if (drag.current?.active) width.set(segmentedPillWidth(c, layout.current.spans))
      })
    )
    return () => off.forEach((unsubscribe) => unsubscribe())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedIndex = () => live.current.options.findIndex((option) => option.value === live.current.value)

  /** Springs (or, with reduced motion or before the first placement, jumps) the pill onto `index`. */
  const moveTo = (index: number, spring: Spring) => {
    const box = layout.current.boxes[index]
    const pill = pillRef.current
    if (!box || !pill) {
      pill?.setAttribute('data-hidden', '')
      return
    }
    pill.removeAttribute('data-hidden')
    const instant = live.current.reduced || !layout.current.placed
    layout.current.placed = true
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
    // Whatever chose it (a tap, a key, a release, the owner), a new selection scrolls into view;
    // new labels or counts leave the scroll where the person put it.
    if (revealed.current !== value) {
      revealed.current = value
      reveal(selected, layout.current.placed ? 'smooth' : 'instant')
    }
    const box = layout.current.boxes[selected]
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
        // At rest: snap to the new geometry without animating a resize.
        const box = layout.current.boxes[index]
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
    live.current.onChange(option.value)
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
    const { spans, boxes } = layout.current
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

  /** While a pill is dragged, a pointer near an edge of a scrolling control scrolls it. */
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
      if (!layout.current.overflow) return
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
    if (live.current.disabled || event.button > 0 || drag.current || !group.current) return
    measure()
    const { spans, boxes, overflow } = layout.current
    if (!boxes.length) return
    const point = local(event.clientX, event.clientY)
    const index = segmentIndexAt(point.x, spans)
    if (index < 0 || spans[index].disabled) return
    const onPill = index === selectedIndex() && !center.isAnimating()
    const touch = event.pointerType === 'touch'
    // A finger off the pill in a scrolling control scrolls it (a tap still selects).
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
    // The click that ends a drag is not a tap.
    suppressClick.current = true
    setTimeout(() => (suppressClick.current = false), 0)
    const { spans } = layout.current
    const index = cancelled
      ? selectedIndex()
      : live.current.reduced
        ? d.index
        : segmentedSnapIndex(center.get(), center.getVelocity(event.timeStamp), spans)
    const target = index >= 0 ? index : selectedIndex()
    moveTo(target, SPRINGS.release)
    if (!cancelled) commit(target)
  }

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) ||
      !enabled.length
    )
      return
    event.preventDefault()
    const rtl = group.current && getComputedStyle(group.current).direction === 'rtl'
    const index = enabled.findIndex((option) => option.value === value)
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const delta =
      (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) *
      (horizontal && rtl ? -1 : 1)
    const next =
      event.key === 'Home'
        ? enabled[0]
        : event.key === 'End'
          ? enabled[enabled.length - 1]
          : enabled[(Math.max(0, index) + delta + enabled.length) % enabled.length]
    onChange(next.value)
    const position = options.findIndex((option) => option.value === next.value)
    const button = buttons()[position]
    // The control scrolls the option into view as the selection follows (see above); an enclosing
    // scroll area shows the control.
    button?.focus({ preventScroll: true })
    revealScrollChild(group.current?.closest<HTMLElement>('.lab-scroll-viewport'), button, {
      inline: false,
    })
  }

  return (
    <div
      ref={group}
      className={cn('lab-segmented', className)}
      data-equal-width={equalWidth || undefined}
      // A press here lifts the pill, not the glass bubble around the control.
      data-glass-own-press=""
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
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
            const content = (
              <>
                {option.icon && (
                  <span className="lab-segmented-icon" data-tone={option.tone} aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span className="lab-segmented-label">{option.label}</span>
                {option.badge && <span className="lab-segmented-badge">{option.badge}</span>}
              </>
            )
            return (
              <Button
                key={option.value}
                variant="ghost"
                appearance="toolbar"
                controlSize="regular"
                className="lab-segmented-option"
                role="radio"
                aria-checked={option.value === value}
                aria-label={option.badge ? `${option.label}, ${option.badge}` : undefined}
                tabIndex={option.value === tabValue ? 0 : -1}
                disabled={disabled || option.disabled}
                onClick={() => onChange(option.value)}
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
    </div>
  )
}
