import { LabVelocityTracker } from './velocity'

export type LabPanAxis = 'x' | 'y'
export type LabPointerKind = 'mouse' | 'touch' | 'pen'

/** A pan's state: movement since it was recognized, and the pointer's speed. */
export type LabPanPoint = {
  /** Horizontal movement in px since the pan was recognized (client coordinates, never mirrored). */
  dx: number
  /** Vertical movement in px since the pan was recognized. */
  dy: number
  /** Horizontal speed in px per second. */
  vx: number
  /** Vertical speed in px per second. */
  vy: number
  /** Client position where the pan was recognized. */
  originX: number
  originY: number
  pointerType: LabPointerKind
  /** The event's timestamp (ms, same clock as `performance.now()`), for velocity tracking. */
  time: number
}

/** What `shouldStart` sees: the first decisive movement and the element under the pointer. */
export type LabPanBegin = LabPanPoint & {
  /** Element the pointer went down on. */
  target: Element | null
  /** Sign of the movement along the pan's axis: 1 = right/down, -1 = left/up (physical). */
  direction: 1 | -1
}

export type LabPanOptions = {
  /** The axis this pan owns. Movement mostly along the other axis is left to the browser. */
  axis: LabPanAxis
  /** Travel in px before the pan decides. Defaults to 10 for touch, 4 for mouse and pen. */
  threshold?: number
  /** Pointer kinds that may drive the pan. Default: all. */
  pointers?: readonly LabPointerKind[]
  /** On contact. Return false to ignore this pointer (e.g. it is not near the edge). */
  canBegin?: (info: { x: number; y: number; target: Element | null; pointerType: LabPointerKind }) => boolean
  /** Once movement passes the threshold along `axis`. Return false to hand it back to the browser. */
  shouldStart?: (info: LabPanBegin) => boolean
  onStart?: (point: LabPanPoint) => void
  onMove?: (point: LabPanPoint) => void
  /** The pan ended; `cancelled` when the browser took the pointer (e.g. a system gesture). */
  onEnd?: (point: LabPanPoint & { cancelled: boolean }) => void
  /**
   * How touch competes with native scrolling. `pointer` (default) relies on CSS `touch-action` on
   * the element (`pan-y` for an x pan, `pan-x` for a y pan). `claim` decides on the first few
   * pixels and cancels the browser's scroll for touches it takes: for a sheet over its own
   * scrolling content, where both want the same axis.
   */
  touch?: 'pointer' | 'claim'
}

type Session = {
  id: number
  touch: boolean
  pointerType: LabPointerKind
  downX: number
  downY: number
  originX: number
  originY: number
  target: Element | null
  started: boolean
  rejected: boolean
  x: LabVelocityTracker
  y: LabVelocityTracker
  lastX: number
  lastY: number
}

let suppressUntil = 0
function suppressClick(event: MouseEvent) {
  if (performance.now() > suppressUntil) return
  event.preventDefault()
  event.stopPropagation()
}
if (typeof window !== 'undefined') window.addEventListener('click', suppressClick, true)

let selectionLocks = 0
function lockSelection(lock: boolean) {
  const root = document.documentElement
  selectionLocks = Math.max(0, selectionLocks + (lock ? 1 : -1))
  if (selectionLocks) {
    root.dataset.labPanning = ''
    window.getSelection?.()?.removeAllRanges()
  } else delete root.dataset.labPanning
}

/**
 * Recognizes a one-finger pan on `element` along one axis, with velocity, and hands the movement
 * to callbacks: the gesture layer under sheets, stacks and anything you drag. It never moves
 * anything itself. `options` is read on every event, so callers can pass a live getter.
 */
export function attachPan(element: HTMLElement, options: () => LabPanOptions): () => void {
  let session: Session | null = null

  const point = (s: Session, x: number, y: number, now: number): LabPanPoint => ({
    dx: x - s.originX,
    dy: y - s.originY,
    vx: s.x.velocity(now),
    vy: s.y.velocity(now),
    originX: s.originX,
    originY: s.originY,
    pointerType: s.pointerType,
    time: now,
  })

  const begin = (
    id: number,
    touch: boolean,
    pointerType: LabPointerKind,
    x: number,
    y: number,
    target: EventTarget | null,
    time: number
  ) => {
    const o = options()
    if (session) return false
    if (o.pointers && !o.pointers.includes(pointerType)) return false
    const el = target instanceof Element ? target : null
    if (o.canBegin && !o.canBegin({ x, y, target: el, pointerType })) return false
    session = {
      id,
      touch,
      pointerType,
      downX: x,
      downY: y,
      originX: x,
      originY: y,
      target: el,
      started: false,
      rejected: false,
      x: new LabVelocityTracker(),
      y: new LabVelocityTracker(),
      lastX: x,
      lastY: y,
    }
    session.x.add(x, time)
    session.y.add(y, time)
    return true
  }

  /** Returns true when this move belongs to the pan (callers then cancel the browser's default). */
  const move = (x: number, y: number, time: number, capture: () => void) => {
    const s = session
    if (!s || s.rejected) return false
    const o = options()
    s.x.add(x, time)
    s.y.add(y, time)
    s.lastX = x
    s.lastY = y
    if (s.started) {
      o.onMove?.(point(s, x, y, time))
      return true
    }
    const dx = x - s.downX,
      dy = y - s.downY
    const threshold = o.threshold ?? (s.pointerType === 'mouse' || s.pointerType === 'pen' ? 4 : 10)
    if (Math.hypot(dx, dy) < (s.touch ? Math.min(threshold, 4) : threshold)) return false
    const main = o.axis === 'x' ? dx : dy,
      cross = o.axis === 'x' ? dy : dx
    if (Math.abs(main) < Math.abs(cross)) {
      s.rejected = true
      return false
    }
    const info: LabPanBegin = {
      ...point(s, x, y, time),
      dx: 0,
      dy: 0,
      target: s.target,
      direction: main >= 0 ? 1 : -1,
    }
    if (o.shouldStart && !o.shouldStart(info)) {
      s.rejected = true
      return false
    }
    // Recognized: measure from here so content does not jump by the threshold distance.
    s.started = true
    s.originX = x
    s.originY = y
    capture()
    lockSelection(true)
    o.onStart?.(point(s, x, y, time))
    return true
  }

  const end = (cancelled: boolean, time: number) => {
    const s = session
    session = null
    removeWindowListeners()
    if (!s?.started) return
    lockSelection(false)
    if (!cancelled) suppressUntil = performance.now() + 350
    options().onEnd?.({ ...point(s, s.lastX, s.lastY, time), cancelled })
  }

  // Pointer path: mouse, pen, and touch unless the pan claims touches itself.
  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    const touch = event.pointerType === 'touch'
    if (touch && options().touch === 'claim') return
    const kind = (['mouse', 'touch', 'pen'].includes(event.pointerType) ? event.pointerType : 'touch') as LabPointerKind
    if (!begin(event.pointerId, false, kind, event.clientX, event.clientY, event.target, event.timeStamp)) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!session || session.touch || event.pointerId !== session.id) return
    const id = event.pointerId
    if (
      move(event.clientX, event.clientY, event.timeStamp, () => {
        try {
          element.setPointerCapture(id)
        } catch {
          /* Synthetic or already-released pointers cannot be captured; window listeners still work. */
        }
      })
    )
      event.preventDefault()
  }
  const onPointerUp = (event: PointerEvent) => {
    if (session && !session.touch && event.pointerId === session.id) end(false, event.timeStamp)
  }
  const onPointerCancel = (event: PointerEvent) => {
    if (session && !session.touch && event.pointerId === session.id) end(true, event.timeStamp)
  }

  // Touch path for `touch: 'claim'`: decide early and cancel the browser's scroll when ours.
  const onTouchStart = (event: TouchEvent) => {
    if (options().touch !== 'claim' || event.touches.length !== 1) {
      if (session?.touch) end(true, event.timeStamp)
      return
    }
    const t = event.changedTouches[0]
    if (!begin(t.identifier, true, 'touch', t.clientX, t.clientY, event.target, event.timeStamp)) return
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchCancel)
  }
  const touchOf = (event: TouchEvent) =>
    session ? Array.from(event.changedTouches).find((t) => t.identifier === session!.id) : undefined
  const onTouchMove = (event: TouchEvent) => {
    const t = touchOf(event)
    if (!t) return
    if (move(t.clientX, t.clientY, event.timeStamp, () => {}) && event.cancelable) event.preventDefault()
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (touchOf(event)) end(false, event.timeStamp)
  }
  const onTouchCancel = (event: TouchEvent) => {
    if (touchOf(event)) end(true, event.timeStamp)
  }

  function removeWindowListeners() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchCancel)
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('touchstart', onTouchStart, { passive: true })
  return () => {
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('touchstart', onTouchStart)
    if (session?.started) lockSelection(false)
    session = null
    removeWindowListeners()
  }
}

/**
 * True when `target` (or an ancestor up to `boundary`) can still scroll in `direction` along
 * `axis`, or is a control that drags on that axis itself (sliders, number fields, `data-lab-pan`).
 * Pans use it to leave nested scrollers and draggable controls alone.
 */
export function canChildPan(
  target: Element | null,
  boundary: Element,
  axis: LabPanAxis,
  direction: 1 | -1
): boolean {
  for (let el: Element | null = target; el && el !== boundary; el = el.parentElement) {
    if (el.matches('input[type="range"], [data-lab-pan], .lab-slider, .lab-number-field')) return true
    const style = getComputedStyle(el)
    const overflow = axis === 'x' ? style.overflowX : style.overflowY
    if (!/(auto|scroll)/.test(overflow)) continue
    const node = el as HTMLElement
    if (axis === 'x') {
      const max = node.scrollWidth - node.clientWidth
      if (max <= 1) continue
      // scrollLeft is negative in RTL scrollers (Chrome/Firefox/Safari today).
      const left = Math.abs(node.scrollLeft)
      const rtl = style.direction === 'rtl'
      const towardStart = rtl ? direction === -1 : direction === 1 // finger moves content toward its start
      if (towardStart ? left > 1 : left < max - 1) return true
    } else {
      const max = node.scrollHeight - node.clientHeight
      if (max <= 1) continue
      if (direction === 1 ? node.scrollTop > 1 : node.scrollTop < max - 1) return true
    }
  }
  return false
}
