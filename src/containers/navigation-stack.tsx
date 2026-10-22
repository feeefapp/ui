'use client'

import * as React from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../primitives/button'
import { ScrollArea } from '../scroll'
import { ToolbarGroup } from '../toolbar'
import { ScaffoldAppBar } from '../workspace/scaffold'
import { useI18n } from '../i18n'
import { attachPan, canChildPan, type PanPoint } from '../physics/gesture'
import { MotionValue, prefersReducedMotion } from '../physics/motion-value'
import { SPRINGS, mix, progressBetween, projectMomentum } from '../physics/spring'
import { diffStack, dragDismissRect, mixRect, slideFrame, zoomFrame, type Rect } from './stack-model'
import { cn } from '../utils'
import './navigation-stack.css'

/** What a page inside a NavigationStack knows about its place in it. */
export type NavigationStackPage = {
  /** Distance from the root page; 0 for the root. */
  depth: number
  /** True for the page on top, the one people see and use. */
  isTop: boolean
  /** True when there is a page to go back to. */
  canGoBack: boolean
  /** Goes back: the stack calls its `onBack`, which removes this page. */
  back: () => void
  /** Title of the page underneath, shown by the back button. */
  previousTitle?: string
}
const ROOT_PAGE: NavigationStackPage = { depth: 0, isTop: true, canGoBack: false, back: () => {} }
const PageContext = React.createContext<NavigationStackPage | null>(null)
/** The nearest stack page's position and `back()`. Outside a stack: a root page that cannot go back. */
export function useNavigationStack() {
  return React.useContext(PageContext) ?? ROOT_PAGE
}

/**
 * Path state for a stack: an array of route values, root page not included. Map it to pages
 * (`path.map((route) => <NavigationPage key=… />)`) and pass `pop` as the stack's `onBack`.
 */
export function useNavigationPath<T>(initial: T[] = []) {
  const [path, setPath] = React.useState<T[]>(initial)
  const push = React.useCallback((route: T) => setPath((p) => [...p, route]), [])
  const pop = React.useCallback((count = 1) => setPath((p) => p.slice(0, Math.max(0, p.length - count))), [])
  const popToRoot = React.useCallback(() => setPath([]), [])
  const replace = React.useCallback((route: T) => setPath((p) => [...p.slice(0, -1), route]), [])
  return { path, setPath, push, pop, popToRoot, replace }
}

type TransitionStyle = 'slide' | 'zoom' | 'fade'
type Transition = {
  serial: number
  kind: 'push' | 'pop' | 'replace'
  /** The page on top while moving: the one arriving (push, replace) or leaving (pop). */
  front: string
  back: string | null
  from: number
  to: number
  animated: boolean
  style: TransitionStyle
}
type StackState = {
  keys: string[]
  /** Pages still drawn while they animate away. */
  leaving: string[]
  transition: Transition | null
  /** A page a finished swipe already moved away; its removal must not animate again. */
  popped: string | null
}

type PageProps = { title?: unknown; backTitle?: unknown; zoomSource?: unknown }
const keyOf = (element: React.ReactElement, index: number) => (element.key == null ? `#${index}` : String(element.key))
const propsOf = (element: React.ReactElement | undefined) => (element?.props ?? {}) as PageProps
const titleOf = (element: React.ReactElement | undefined) => {
  const props = propsOf(element)
  return typeof props.backTitle === 'string' ? props.backTitle : typeof props.title === 'string' ? props.title : undefined
}
const sameKeys = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((k, i) => k === b[i])

function nextState(state: StackState, keys: string[], styleOf: (key: string) => TransitionStyle): StackState {
  const change = diffStack(state.keys, keys)
  const serial = (state.transition?.serial ?? 0) + 1
  if (change.kind === 'none') return { ...state, keys, popped: null }
  if (change.kind === 'push')
    return {
      keys,
      leaving: [],
      popped: null,
      transition: {
        serial,
        kind: 'push',
        front: change.enter,
        back: change.exit,
        from: 0,
        to: 1,
        animated: change.exit !== null,
        style: styleOf(change.enter),
      },
    }
  if (change.kind === 'pop') {
    const swiped = state.popped === change.exit
    return {
      keys,
      leaving: swiped ? [] : [change.exit],
      popped: null,
      transition: {
        serial,
        kind: 'pop',
        front: change.exit,
        back: change.enter,
        from: 1,
        to: 0,
        animated: !swiped && change.enter !== null,
        style: styleOf(change.exit),
      },
    }
  }
  return {
    keys,
    leaving: change.exit ? [change.exit] : [],
    popped: null,
    transition: {
      serial,
      kind: 'replace',
      front: change.enter,
      back: change.exit,
      from: 0,
      to: 1,
      animated: change.exit !== null,
      style: 'fade',
    },
  }
}

/** Text-like targets where a mouse drag means "select", not "dismiss". */
const isTextTarget = (target: Element | null) =>
  !!target?.closest('p, span, h1, h2, h3, h4, li, td, th, code, pre, label, a, [contenteditable], input, textarea')

function focusPage(host: HTMLElement | null) {
  if (!host) return
  const heading = host.querySelector<HTMLElement>('[data-lab-page-title]')
  ;(heading ?? host).focus({ preventScroll: true })
}

export type NavigationStackProps = {
  /**
   * The pages, root first, each a keyed element (usually a NavigationPage). Append a page to
   * push it; remove the top one to pop. The stack animates whatever changed.
   */
  children: React.ReactNode
  /** The person went back (back button or swipe). Remove the top page in response. */
  onBack?: () => void
  /**
   * Swipe back with a finger or pen: from anywhere on the page (`content`, default, like iOS 26),
   * only from the leading edge (`edge`), or `off`. A mouse can always drag from the leading edge.
   */
  swipeBack?: 'content' | 'edge' | 'off'
  /** Accessible name of the stack region. */
  label?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Push-and-pop page navigation, like iOS: a pushed page slides in over the current one, which
 * moves back with a parallax and dims; going back reverses it. Swiping toward the trailing edge
 * drags the page back with the finger and finishes or cancels from the release velocity. A page
 * pushed with `zoomSource` grows out of that element instead and can be dragged down to shrink
 * back into it. Every page stays mounted, so scroll positions and drafts survive.
 */
export function NavigationStack({
  children,
  onBack,
  swipeBack = 'content',
  label = 'Pages',
  className,
  style,
}: NavigationStackProps) {
  const pages: React.ReactElement[] = []
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) pages.push(child)
  })
  const keys = pages.map(keyOf)
  const latched = React.useRef(new Map<string, React.ReactElement>())
  pages.forEach((page, i) => latched.current.set(keys[i], page))

  const styleOf = (key: string): TransitionStyle =>
    typeof propsOf(latched.current.get(key)).zoomSource === 'string' ? 'zoom' : 'slide'
  const [state, setState] = React.useState<StackState>(() => ({
    keys,
    leaving: [],
    transition: null,
    popped: null,
  }))
  let current = state
  if (!sameKeys(state.keys, keys)) {
    current = nextState(state, keys, styleOf)
    setState(current)
  }

  const root = React.useRef<HTMLDivElement>(null)
  const hosts = React.useRef(new Map<string, HTMLElement>())
  const shown = React.useRef<MotionValue | null>(null)
  if (!shown.current) shown.current = new MotionValue(1, 0.0005)
  const painter = React.useRef<((value: number) => void) | null>(null)
  const activeFront = React.useRef<string | null>(null)
  const returnFocus = React.useRef(new Map<string, Element | null>())
  const live = React.useRef({ keys: current.keys, transition: current.transition, onBack, swipeBack })
  live.current = { keys: current.keys, transition: current.transition, onBack, swipeBack }
  React.useLayoutEffect(() => shown.current!.subscribe((value) => painter.current?.(value)), [])

  const hostRef = React.useCallback(
    (key: string) => (element: HTMLElement | null) => {
      if (element) hosts.current.set(key, element)
      else hosts.current.delete(key)
    },
    []
  )
  const dimOf = (host: HTMLElement | null) => host?.querySelector<HTMLElement>(':scope > .lab-nav-page-dim') ?? null
  const resetHosts = () => {
    for (const host of hosts.current.values()) {
      host.style.transform = ''
      host.style.clipPath = ''
      host.style.opacity = ''
      delete host.dataset.moving
      delete host.dataset.front
      const dim = dimOf(host)
      if (dim) dim.style.opacity = ''
    }
  }
  const restoreSources = (host: HTMLElement | null | undefined) => {
    host?.querySelectorAll<HTMLElement>('[data-lab-zoom-hidden]').forEach((el) => {
      delete el.dataset.labZoomHidden
      el.style.opacity = ''
    })
  }
  const pageSize = () => ({ width: root.current?.clientWidth ?? 1, height: root.current?.clientHeight ?? 1 })
  /** Screen px per layout px: below 1 when an ancestor is scaled (a scaled demo, a sheet's backdrop). */
  const screenScale = () => {
    const el = root.current
    return el && el.clientWidth ? el.getBoundingClientRect().width / el.clientWidth || 1 : 1
  }
  const rtl = () => !!root.current && getComputedStyle(root.current).direction === 'rtl'
  /** The element a zoom page grew from, in stack coordinates, or a centered fallback. */
  const zoomSourceOf = (front: string, back: HTMLElement | null) => {
    const id = propsOf(latched.current.get(front)).zoomSource
    const element =
      typeof id === 'string' ? back?.querySelector<HTMLElement>(`[data-lab-zoom-source="${CSS.escape(id)}"]`) : null
    const page = pageSize()
    const origin = root.current!.getBoundingClientRect()
    const k = screenScale()
    if (element) {
      const box = element.getBoundingClientRect()
      if (box.width > 0 && box.bottom > origin.top && box.top < origin.bottom)
        return {
          element,
          rect: {
            x: (box.left - origin.left) / k,
            y: (box.top - origin.top) / k,
            width: box.width / k,
            height: box.height / k,
          },
          radius: parseFloat(getComputedStyle(element).borderTopLeftRadius) || 12,
        }
    }
    return {
      element: null,
      rect: { x: page.width * 0.3, y: page.height * 0.36, width: page.width * 0.4, height: page.height * 0.28 },
      radius: 24,
    }
  }
  const slidePainter = (front: HTMLElement, back: HTMLElement | null) => {
    const width = pageSize().width,
      mirrored = rtl()
    const dim = dimOf(back)
    return (value: number) => {
      const frame = slideFrame(value, width, mirrored)
      front.style.transform = `translate3d(${frame.front}px, 0, 0)`
      if (back) back.style.transform = `translate3d(${frame.back}px, 0, 0)`
      if (dim) dim.style.opacity = String(frame.dim)
    }
  }
  const fadePainter = (front: HTMLElement) => (value: number) => {
    front.style.opacity = String(Math.max(0, Math.min(1, value)))
  }
  const zoomPainter = (front: HTMLElement, frontKey: string, back: HTMLElement | null) => {
    const page = pageSize()
    const full: Rect = { x: 0, y: 0, ...page }
    const source = zoomSourceOf(frontKey, back)
    if (source.element) source.element.dataset.labZoomHidden = ''
    return (value: number) => {
      const frame = zoomFrame(mixRect(source.rect, full, value), mix(source.radius, 0, value), page)
      const appear = progressBetween(value, 0, 0.22)
      front.style.transform = frame.transform
      front.style.clipPath = frame.clip
      front.style.opacity = String(appear)
      if (source.element) source.element.style.opacity = String(1 - appear)
    }
  }

  // Run each transition: paint its first frame before the browser paints, then spring.
  React.useLayoutEffect(() => {
    const transition = current.transition
    if (!transition) return
    const front = hosts.current.get(transition.front) ?? null
    const back = transition.back ? (hosts.current.get(transition.back) ?? null) : null
    const value = shown.current!
    const continuing = activeFront.current === transition.front && value.isAnimating()
    if (!continuing) value.stop()
    resetHosts()
    painter.current = null

    if (transition.kind === 'push') {
      returnFocus.current.set(transition.front, document.activeElement)
      focusPage(front)
    } else if (transition.kind === 'pop') {
      const target = returnFocus.current.get(transition.front)
      returnFocus.current.delete(transition.front)
      if (target instanceof HTMLElement && target.isConnected && back?.contains(target))
        target.focus({ preventScroll: true })
      else focusPage(back)
    } else focusPage(front)

    const finish = () => {
      painter.current = null
      activeFront.current = null
      resetHosts()
      if (transition.kind === 'pop') restoreSources(back)
      for (const key of [...latched.current.keys()])
        if (!live.current.keys.includes(key)) latched.current.delete(key)
      setState((s) =>
        s.transition?.serial === transition.serial ? { ...s, leaving: [], transition: null } : s
      )
    }
    if (!front || !transition.animated) {
      value.set(transition.to)
      finish()
      return
    }
    const reduced = prefersReducedMotion()
    const style: TransitionStyle = reduced ? 'fade' : transition.style
    front.dataset.moving = ''
    front.dataset.front = ''
    if (back) back.dataset.moving = ''
    const paint =
      style === 'zoom'
        ? zoomPainter(front, transition.front, back)
        : style === 'slide'
          ? slidePainter(front, back)
          : fadePainter(front)
    if (!continuing) value.set(transition.from)
    activeFront.current = transition.front
    painter.current = paint
    paint(value.get())
    void value
      .animateTo(transition.to, { spring: reduced ? { duration: 0.2, bounce: 0 } : SPRINGS.smooth })
      .then((arrived) => {
        if (arrived) finish()
      })
  }, [current.transition?.serial])

  // Swipe back (x) and, on zoom pages, drag down to dismiss (y).
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    type Session = {
      key: string
      front: HTMLElement
      back: HTMLElement | null
      style: TransitionStyle
      axis: 'x' | 'y'
      sign: 1 | -1
      page: { width: number; height: number }
      anchor: { x: number; y: number }
      motion: MotionValue
      rect: Rect
      radius: number
      /** Screen px per layout px. */
      k: number
    }
    let session: Session | null = null
    const topKey = () => live.current.keys[live.current.keys.length - 1]
    const ready = () => live.current.keys.length > 1 && !live.current.transition && !session

    const start = (axis: 'x' | 'y', point: PanPoint) => {
      const key = topKey()
      const front = hosts.current.get(key)
      if (!front) return
      const back = hosts.current.get(live.current.keys[live.current.keys.length - 2]) ?? null
      const origin = el.getBoundingClientRect()
      const k = screenScale()
      shown.current!.stop()
      session = {
        key,
        front,
        back,
        style: prefersReducedMotion() ? 'fade' : styleOf(key),
        axis,
        sign: rtl() ? -1 : 1,
        page: pageSize(),
        anchor: { x: (point.originX - origin.left) / k, y: (point.originY - origin.top) / k },
        motion: new MotionValue(0, 0.0005),
        rect: { x: 0, y: 0, ...pageSize() },
        radius: 0,
        k,
      }
      front.dataset.moving = ''
      front.dataset.front = ''
      if (back) back.dataset.moving = ''
      if (session.style === 'zoom') {
        const source = zoomSourceOf(key, back)
        if (source.element) source.element.dataset.labZoomHidden = ''
      } else painter.current = session.style === 'slide' ? slidePainter(front, back) : fadePainter(front)
    }

    /** Pointer movement in layout px. */
    const local = <P extends PanPoint>(point: P, k: number): P => ({
      ...point,
      dx: point.dx / k,
      dy: point.dy / k,
      vx: point.vx / k,
      vy: point.vy / k,
    })
    const move = (screen: PanPoint) => {
      const s = session
      if (!s) return
      const point = local(screen, s.k)
      if (s.style === 'zoom') {
        const pull = s.axis === 'y' ? point.dy : Math.max(0, point.dx * s.sign) * 0.7 + Math.max(0, point.dy)
        s.rect = dragDismissRect(s.page, s.anchor, point.dx, point.dy, pull)
        s.radius = mix(0, 28, progressBetween(pull, 0, 140))
        const frame = zoomFrame(s.rect, s.radius, s.page)
        s.front.style.transform = frame.transform
        s.front.style.clipPath = frame.clip
        return
      }
      const travel = Math.max(0, point.dx * s.sign)
      shown.current!.track(1 - Math.min(1, travel / s.page.width), point.time)
    }

    const settle = (s: Session) => {
      painter.current = null
      delete s.front.dataset.moving
      delete s.front.dataset.front
      s.front.style.transform = ''
      s.front.style.clipPath = ''
      s.front.style.opacity = ''
      if (s.back) {
        delete s.back.dataset.moving
        s.back.style.transform = ''
        const dim = dimOf(s.back)
        if (dim) dim.style.opacity = ''
      }
    }
    const popped = (s: Session) => {
      setState((state) => ({ ...state, popped: s.key }))
      live.current.onBack?.()
      // If the host keeps the page, bring it back.
      window.setTimeout(() => {
        if (topKey() !== s.key || live.current.transition) return
        setState((state) => (state.popped === s.key ? { ...state, popped: null } : state))
        if (s.style === 'zoom') {
          settle(s)
          return
        }
        s.front.dataset.moving = ''
        if (s.back) s.back.dataset.moving = ''
        painter.current = s.style === 'slide' ? slidePainter(s.front, s.back) : fadePainter(s.front)
        void shown.current!.animateTo(1, { spring: SPRINGS.release }).then((done) => done && settle(s))
      }, 500)
    }

    const end = (screen: PanPoint & { cancelled: boolean }) => {
      const s = session
      session = null
      if (!s) return
      const point = local(screen, s.k)
      if (s.style !== 'zoom') {
        const travel = point.dx * s.sign,
          speed = point.vx * s.sign
        const complete = !point.cancelled && projectMomentum(travel, speed, 0.99) > s.page.width / 2 && speed > -250
        const velocity = shown.current!.getVelocity(point.time)
        void shown.current!.animateTo(complete ? 0 : 1, { spring: SPRINGS.release, velocity }).then((done) => {
          if (!done) return
          if (complete) popped(s)
          else settle(s)
        })
        return
      }
      const pull = s.axis === 'y' ? point.dy : Math.max(0, point.dx * s.sign) * 0.7 + Math.max(0, point.dy)
      const speed = s.axis === 'y' ? point.vy : Math.max(0, point.vx * s.sign) * 0.7 + Math.max(0, point.vy)
      const dismiss = !point.cancelled && projectMomentum(pull, speed, 0.99) > s.page.height * 0.22
      const from = s.rect,
        fromRadius = s.radius
      const source = zoomSourceOf(s.key, s.back)
      const to: Rect = dismiss ? source.rect : { x: 0, y: 0, ...s.page }
      const toRadius = dismiss ? source.radius : 0
      const dx = to.x - from.x,
        dy = to.y - from.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      const toward = (point.vx * dx + point.vy * dy) / (distance * distance)
      const motion = s.motion
      motion.set(0)
      const unsubscribe = motion.subscribe((q) => {
        const frame = zoomFrame(mixRect(from, to, q), mix(fromRadius, toRadius, q), s.page)
        s.front.style.transform = frame.transform
        s.front.style.clipPath = frame.clip
        if (dismiss) {
          const fade = progressBetween(q, 0.72, 1)
          s.front.style.opacity = String(1 - fade)
          if (source.element) source.element.style.opacity = String(fade)
        }
      })
      void motion
        .animateTo(1, { spring: SPRINGS.release, velocity: Math.max(0, Math.min(8, toward)) })
        .then((done) => {
          unsubscribe()
          if (!done) return
          if (dismiss) popped(s)
          else settle(s)
        })
    }

    const detachX = attachPan(el, () => ({
      axis: 'x',
      canBegin: ({ x, pointerType }) => {
        const mode = live.current.swipeBack
        if (mode === 'off' || !ready()) return false
        const box = el.getBoundingClientRect()
        const fromEdge = rtl() ? box.right - x : x - box.left
        return fromEdge <= 28 || (mode === 'content' && pointerType !== 'mouse')
      },
      shouldStart: ({ direction, target }) =>
        direction === (rtl() ? -1 : 1) && !canChildPan(target, el, 'x', direction),
      onStart: (point) => start('x', point),
      onMove: move,
      onEnd: end,
    }))
    const detachY = attachPan(el, () => ({
      axis: 'y',
      touch: 'claim',
      canBegin: ({ target, pointerType }) =>
        live.current.swipeBack !== 'off' &&
        ready() &&
        styleOf(topKey()) === 'zoom' &&
        !prefersReducedMotion() &&
        (pointerType !== 'mouse' || !isTextTarget(target)),
      shouldStart: ({ direction, target }) => direction === 1 && !canChildPan(target, el, 'y', 1),
      onStart: (point) => start('y', point),
      onMove: move,
      onEnd: end,
    }))
    return () => {
      detachX()
      detachY()
    }
  }, [])

  const top = current.keys[current.keys.length - 1]
  const order =
    current.transition?.kind === 'replace'
      ? [...current.keys.slice(0, -1), ...current.leaving, top]
      : [...current.keys, ...current.leaving]
  const back = React.useCallback(() => live.current.onBack?.(), [])
  return (
    <div ref={root} className={cn('lab-nav-stack', className)} style={style} role="region" aria-label={label}>
      {[...new Set(order)].map((key) => {
        const element = latched.current.get(key)
        if (!element) return null
        const depth = current.keys.indexOf(key)
        const leaving = depth < 0
        const isTop = key === top && !leaving
        const previous = depth > 0 ? latched.current.get(current.keys[depth - 1]) : undefined
        return (
          <section
            key={key}
            ref={hostRef(key)}
            className="lab-nav-page-host"
            data-state={isTop ? 'top' : leaving ? 'leaving' : 'below'}
            aria-label={typeof propsOf(element).title === 'string' ? (propsOf(element).title as string) : undefined}
            aria-hidden={isTop ? undefined : true}
            inert={!isTop || undefined}
            tabIndex={-1}
          >
            <StackPage
              depth={Math.max(0, depth)}
              isTop={isTop}
              back={back}
              previousTitle={titleOf(previous)}
            >
              {element}
            </StackPage>
            <div className="lab-nav-page-dim" aria-hidden="true" />
          </section>
        )
      })}
    </div>
  )
}

function StackPage({
  depth,
  isTop,
  back,
  previousTitle,
  children,
}: {
  depth: number
  isTop: boolean
  back: () => void
  previousTitle?: string
  children: React.ReactNode
}) {
  const value = React.useMemo<NavigationStackPage>(
    () => ({ depth, isTop, canGoBack: depth > 0, back, previousTitle }),
    [depth, isTop, back, previousTitle]
  )
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}

export type NavigationPageProps = {
  /** Page title: the large title, the bar title once it scrolls away, and the next page's back label. */
  title: string
  /** `large` shows a big title in the content that collapses into the bar; `inline` shows it in the bar. Default: large on the root page, inline when pushed. */
  titleDisplay?: 'large' | 'inline'
  /** Shown under the large title. */
  subtitle?: React.ReactNode
  /** Extra controls after the back button, in the same glass group. */
  leading?: React.ReactNode
  /** Controls at the end of the bar; wrap them in a ToolbarGroup. */
  trailing?: React.ReactNode
  /** Floats over the bottom, usually a Dock with the page's actions. */
  bottom?: React.ReactNode
  /** What the back button of the next page says for this one. Defaults to `title`. */
  backTitle?: string
  /** Hides the bar (for full-bleed media pages); the stack's swipe still goes back. */
  hideBar?: boolean
  /** When pushed, grow out of the element with `data-lab-zoom-source` equal to this id on the page below. */
  zoomSource?: string
  /** Inline content padding in px. */
  contentPadding?: number
  /** Accessible name of the scrolling content. Defaults to the title. */
  contentLabel?: string
  children?: React.ReactNode
  className?: string
}

/**
 * One page of a NavigationStack: its own scroll area with a floating glass bar (back button
 * with the previous title, the page title, trailing actions) and an optional bottom dock. A large
 * title scrolls under the bar and reappears in it, like iOS.
 */
export function NavigationPage({
  title,
  titleDisplay,
  subtitle,
  leading,
  trailing,
  bottom,
  hideBar,
  contentPadding,
  contentLabel,
  children,
  className,
}: NavigationPageProps) {
  const page = useNavigationStack()
  const { t } = useI18n()
  const display = titleDisplay ?? (page.depth === 0 ? 'large' : 'inline')
  const viewport = React.useRef<HTMLDivElement>(null)
  const bar = React.useRef<HTMLElement>(null)
  const heading = React.useRef<HTMLHeadingElement>(null)
  const [collapsed, setCollapsed] = React.useState(false)

  React.useLayoutEffect(() => {
    const scroller = viewport.current
    if (display !== 'large' || !scroller) return
    let frame = 0
    const measure = () => {
      frame = 0
      const titleBox = heading.current?.getBoundingClientRect()
      const barBox = bar.current?.getBoundingClientRect()
      if (!titleBox) return
      const line = barBox ? barBox.bottom : scroller.getBoundingClientRect().top
      setCollapsed(titleBox.bottom <= line + 2)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    // The bar's reserved height arrives after the first layout; fonts and resizes move the title.
    const resize = new ResizeObserver(onScroll)
    resize.observe(scroller)
    // Border box: the content's top padding is the bar's reservation.
    if (scroller.firstElementChild) resize.observe(scroller.firstElementChild, { box: 'border-box' })
    if (bar.current) resize.observe(bar.current)
    if (heading.current) resize.observe(heading.current)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      resize.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [display])

  const titleShown = display === 'inline' || collapsed
  const backLabel = page.previousTitle ? t('lab.nav.backTo', { title: page.previousTitle }) : t('lab.nav.back')
  const header = hideBar ? undefined : (
    <ScaffoldAppBar
      className="lab-nav-bar"
      leading={
        page.canGoBack || leading ? (
          <ToolbarGroup label="Navigation" className="lab-nav-bar-leading">
            {page.canGoBack && (
              <Button
                variant="text"
                appearance="toolbar"
                className="lab-nav-back"
                aria-label={backLabel}
                onClick={page.back}
              >
                <ChevronLeft className="lab-dir-flip" aria-hidden="true" />
                <span className="lab-nav-back-label">{page.previousTitle ?? t('lab.nav.back')}</span>
              </Button>
            )}
            {leading}
          </ToolbarGroup>
        ) : undefined
      }
      trailing={trailing}
    >
      <ToolbarGroup
        label="Page title"
        className="lab-nav-bar-title"
        data-shown={titleShown}
        data-glass-hidden={titleShown ? undefined : ''}
        aria-hidden={display === 'large' ? true : undefined}
      >
        {display === 'inline' ? (
          <h1 className="lab-nav-bar-heading" tabIndex={-1} data-lab-page-title>
            {title}
          </h1>
        ) : (
          <span className="lab-nav-bar-heading">{title}</span>
        )}
      </ToolbarGroup>
    </ScaffoldAppBar>
  )
  return (
    <ScrollArea
      ref={viewport}
      className={cn('lab-nav-page', className)}
      label={contentLabel ?? title}
      contentPadding={contentPadding}
      top={header ? <div ref={bar as React.Ref<HTMLDivElement>} className="lab-nav-bar-host">{header}</div> : undefined}
      bottom={bottom}
    >
      {display === 'large' && (
        <header className="lab-nav-large-title">
          <h1 ref={heading} tabIndex={-1} data-lab-page-title>
            {title}
          </h1>
          {subtitle && <div className="lab-nav-subtitle">{subtitle}</div>}
        </header>
      )}
      {children}
    </ScrollArea>
  )
}
