'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils'
import { cornerFit } from '../brand/corner-fit'
import { onAnimationFrame, prefersReducedMotion } from '../physics/motion-value'
import { useFloatingBoundary } from './boundary'
import {
  MENU_MORPH,
  menuAlign,
  menuBubblePath,
  menuCloseFrame,
  menuFadeFrame,
  menuOpenFrame,
  menuRestFrame,
  type MenuBox,
  type MenuMorphFrame,
} from './morph-model'
import './menu.css'

/** Minimum distance between a floating panel and the edges of its bounds, in px. */
export const MENU_COLLISION_PADDING = 12

export type MenuSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Decorate the Radix content part (DropdownMenu, Select or Popover `Content`) instead of rendering a div. */
  asChild?: boolean
  /**
   * The menu covers the button that opened it and grows out of it (default). False opens it beside
   * its trigger, `gap` away, for submenus.
   */
  cover?: boolean
  /** Distance from the trigger when `cover` is false, in px. */
  gap?: number
}

type Layers = {
  shadow: HTMLSpanElement | null
  bubble: HTMLDivElement | null
  body: HTMLDivElement | null
  edge: HTMLSpanElement | null
}

/**
 * The kit's menu: one Liquid Glass bubble that grows out of the button that opened it (the button
 * pinches, the bubble springs to the menu's size on `SPRINGS.menu`, the rows sharpen inside it) and
 * flies back into it when it closes. It covers its trigger, lines up with the trigger's edge in
 * toolbars and centres on it elsewhere, and stays inside the nearest `FloatingBoundary` (else the
 * window). With `asChild` it decorates a Radix content part: Radix keeps focus, keyboard and
 * dismissal; the surface supplies placement defaults (`sideOffset`, `align`, `collisionBoundary`,
 * `collisionPadding`) that the content's own props override. Reduced motion crossfades instead;
 * reduced transparency and more contrast paint it solid.
 */
export const MenuSurface = React.forwardRef<HTMLDivElement, MenuSurfaceProps>(
  ({ asChild = false, cover = true, gap = 4, className, children, ...props }, ref) => {
    const boundary = useFloatingBoundary()
    const node = React.useRef<HTMLElement | null>(null)
    const layers = React.useRef<Layers>({ shadow: null, bubble: null, body: null, edge: null })
    const placed = React.useRef(false)
    const [placement, setPlacement] = React.useState<{
      offset: number
      align: 'start' | 'center' | 'end'
      boundary: Element | null
    } | null>(null)

    const setNode = React.useCallback(
      (element: HTMLElement | null) => {
        node.current = element
        if (typeof ref === 'function') ref(element as HTMLDivElement | null)
        else if (ref) ref.current = element as HTMLDivElement | null
      },
      [ref]
    )

    React.useLayoutEffect(() => {
      if (!asChild || !node.current) return
      const trigger = findTrigger(node.current)
      const bounds = (boundary ?? trigger?.closest('[data-lab-boundary]') ?? null) as HTMLElement | null
      const rtl = getComputedStyle(node.current).direction === 'rtl'
      let align: 'start' | 'center' | 'end' = 'center'
      if (trigger && cover) {
        const rect = trigger.getBoundingClientRect()
        const area = bounds?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth }
        align = menuAlign(isToolbarTrigger(trigger), rect.left + rect.width / 2, area.left, area.right, rtl)
      }
      setPlacement({
        offset: cover && trigger ? -trigger.offsetHeight : gap,
        align,
        boundary: bounds,
      })
    }, [asChild, boundary, cover, gap])
    React.useLayoutEffect(() => {
      placed.current = !!placement
    }, [placement])

    React.useLayoutEffect(() => {
      const element = node.current
      if (!asChild || !element) return
      return runMorph(element, layers.current, cover, () => placed.current)
    }, [asChild, cover])

    const content = (inner: React.ReactNode) => (
      <>
        <span className="lab-menu__shadow" aria-hidden="true" ref={(el) => void (layers.current.shadow = el)} />
        <div className="lab-menu__bubble" ref={(el) => void (layers.current.bubble = el)}>
          <div className="lab-menu__body" ref={(el) => void (layers.current.body = el)}>
            {inner}
          </div>
        </div>
        <span className="lab-menu__edge" aria-hidden="true" ref={(el) => void (layers.current.edge = el)} />
      </>
    )

    if (!asChild)
      return (
        <div {...props} ref={setNode} className={cn('lab-menu', className)} data-lab-menu-phase="open">
          {content(children)}
        </div>
      )

    const child = React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }>
    const radix = {
      sideOffset: placement?.offset ?? 0,
      ...(cover ? { align: placement?.align ?? 'center' } : {}),
      collisionPadding: MENU_COLLISION_PADDING,
      collisionBoundary: placement?.boundary ?? undefined,
    }
    return (
      <Slot
        {...radix}
        {...props}
        ref={setNode}
        className={cn('lab-menu', className)}
        data-lab-menu-phase="pending"
      >
        {React.cloneElement(child, undefined, content(child.props.children))}
      </Slot>
    )
  }
)
MenuSurface.displayName = 'MenuSurface'

/** The element that opened `content`: Radix marks it with `aria-controls` while open. */
function findTrigger(content: HTMLElement) {
  if (!content.id) return null
  return content.ownerDocument.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(content.id)}"]`)
}

function isToolbarTrigger(trigger: HTMLElement) {
  return !!trigger.closest(
    '[role="toolbar"], .lab-toolbar-group, .lab-glass-group, .lab-actions-bar, .lab-dock, .lab-scaffold-app-bar'
  )
}

function radiusOf(element: HTMLElement, box: MenuBox) {
  const css = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
  return Math.min(css / cornerFit(), Math.min(box.width, box.height) / 2)
}

/**
 * Drives one menu's morph on its own frame loop: waits for Radix to place it, grows it out of its
 * trigger, rests, and flies back when Radix marks it closed (`data-state="closed"`, or the kit's
 * `data-closing` for Select). Measures every frame, so a scrolling trigger is followed. Returns
 * the cleanup.
 */
function runMorph(content: HTMLElement, layers: Layers, cover: boolean, placed: () => boolean) {
  const { shadow, bubble, body, edge } = layers
  if (!shadow || !bubble || !body || !edge) return
  const reduced = prefersReducedMotion()
  let trigger = findTrigger(content)
  const savedOpacity = trigger?.style.opacity ?? ''
  const savedTransition = trigger?.style.transition ?? ''
  let hidden = false
  const hideTrigger = (hide: boolean) => {
    if (!trigger || !cover || hide === hidden) return
    hidden = hide
    trigger.style.transition = hide ? 'opacity 60ms linear' : 'opacity 120ms ease-out'
    trigger.style.opacity = hide ? '0' : savedOpacity
  }

  let phase: 'pending' | 'opening' | 'open' | 'closing' | 'closed' = 'pending'
  let started = 0
  let waited = 0
  let shown: MenuMorphFrame | null = null
  let closingFrom: MenuMorphFrame | null = null
  let triggerRadius = 0
  let menuRadius = 0

  const paint = (frame: MenuMorphFrame) => {
    shown = frame
    const fit = cornerFit()
    const atRest = frame.settled && phase === 'open'
    bubble.style.clipPath = atRest ? '' : `path('${menuBubblePath(frame.box, frame.radius)}')`
    for (const layer of [shadow, edge]) {
      const s = layer.style
      if (atRest) {
        s.inset = ''
        s.width = ''
        s.height = ''
        s.borderRadius = ''
      } else {
        s.inset = `${frame.box.y}px auto auto ${frame.box.x}px`
        s.width = `${frame.box.width}px`
        s.height = `${frame.box.height}px`
        s.borderRadius = `${frame.radius * fit}px`
      }
      s.opacity = frame.materialOpacity >= 1 ? '' : String(frame.materialOpacity)
    }
    bubble.style.opacity = frame.materialOpacity >= 1 ? '' : String(frame.materialOpacity)
    body.style.opacity = frame.contentOpacity >= 1 ? '' : String(frame.contentOpacity)
    body.style.filter = frame.contentBlur > 0.05 ? `blur(${frame.contentBlur.toFixed(2)}px)` : ''
  }
  // Invisible (but focusable) until Radix has placed it.
  for (const layer of [shadow, bubble, edge, body]) layer.style.opacity = '0'

  const measure = () => {
    const rect = content.getBoundingClientRect()
    const scale = content.offsetWidth ? rect.width / content.offsetWidth : 1
    const full: MenuBox = { x: 0, y: 0, width: content.offsetWidth, height: content.offsetHeight }
    const t = trigger?.isConnected ? trigger.getBoundingClientRect() : null
    const from: MenuBox | null = t
      ? {
          x: (t.left - rect.left) / scale,
          y: (t.top - rect.top) / scale,
          width: t.width / scale,
          height: t.height / scale,
        }
      : null
    return { full, from }
  }

  const isClosing = () => content.getAttribute('data-state') === 'closed' || content.hasAttribute('data-closing')

  let stop: (() => void) | null = null
  const tick = (now: number) => {
    if (!content.isConnected) return finish()
    if (phase === 'pending') {
      const wrapper = content.parentElement
      const positioned = !wrapper?.style.transform.includes('-200%')
      const { full, from } = measure()
      const covering =
        !cover ||
        !from ||
        (from.y < full.height - 1 && from.y + from.height > 1)
      waited++
      if (waited < 30 && (!positioned || !placed() || (!covering && waited < 10))) return
      trigger = trigger ?? findTrigger(content)
      triggerRadius = trigger && from ? radiusOf(trigger, from) : 0
      menuRadius = radiusOf(bubble, full)
      content.setAttribute('data-lab-menu-phase', 'opening')
      phase = 'opening'
      started = now
    }
    const elapsed = (now - started) / 1000
    const { full, from } = measure()
    if (phase === 'opening') {
      if (isClosing()) return beginClose(now)
      const frame =
        reduced || !from
          ? menuFadeFrame(elapsed, true, full, menuRadius)
          : menuOpenFrame(elapsed, from, triggerRadius, full, menuRadius)
      if (elapsed >= (reduced || !from ? 0 : MENU_MORPH.hideTrigger)) hideTrigger(true)
      if (frame.settled) {
        phase = 'open'
        content.setAttribute('data-lab-menu-phase', 'open')
        paint(menuRestFrame(full, menuRadius))
        stopLoop()
        return
      }
      paint(frame)
      return
    }
    if (phase === 'closing') {
      const target = from ?? full
      const frame =
        reduced || !from || !closingFrom
          ? menuFadeFrame(elapsed, false, shown?.box ?? full, shown?.radius ?? menuRadius)
          : menuCloseFrame(elapsed, closingFrom, target, triggerRadius)
      if (reduced || !from || elapsed >= MENU_MORPH.revealTrigger) hideTrigger(false)
      paint(frame)
      if (frame.settled) {
        phase = 'closed'
        stopLoop()
      }
    }
  }

  const beginClose = (now: number) => {
    if (phase === 'closing' || phase === 'closed') return
    const { full } = measure()
    closingFrom = shown ?? menuRestFrame(full, menuRadius)
    if (phase === 'pending') {
      hideTrigger(false)
      phase = 'closed'
      return
    }
    phase = 'closing'
    content.setAttribute('data-lab-menu-phase', 'closing')
    started = now
    startLoop()
  }

  const startLoop = () => {
    if (!stop) stop = onAnimationFrame(tick)
  }
  const stopLoop = () => {
    stop?.()
    stop = null
  }
  // The menu opens over its own trigger, so the release of the press that opened it lands on a
  // row; Radix would run that row (press-drag-release). Only a release after a press inside the
  // menu, or after the pointer travelled to another row, selects.
  let pressedInside = false
  let travel = 0
  let last: { x: number; y: number } | null = null
  const onDown = () => {
    pressedInside = true
  }
  const onMove = (event: PointerEvent) => {
    if (last) travel += Math.hypot(event.clientX - last.x, event.clientY - last.y)
    last = { x: event.clientX, y: event.clientY }
  }
  const onUp = (event: PointerEvent) => {
    if (!pressedInside && travel < 8) event.stopPropagation()
    pressedInside = false
  }
  const doc = content.ownerDocument
  content.addEventListener('pointerdown', onDown, true)
  content.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointermove', onMove, true)

  const observer = new MutationObserver(() => {
    if (isClosing()) beginClose(performance.now())
  })
  observer.observe(content, { attributes: true, attributeFilter: ['data-state', 'data-closing'] })

  const finish = () => {
    stopLoop()
    observer.disconnect()
    content.removeEventListener('pointerdown', onDown, true)
    content.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointermove', onMove, true)
    if (trigger) {
      trigger.style.opacity = savedOpacity
      trigger.style.transition = savedTransition
    }
  }
  startLoop()
  return finish
}
