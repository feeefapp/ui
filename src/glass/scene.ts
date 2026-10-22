import { MotionValue, onAnimationFrame } from '../physics/motion-value'
import { SPRINGS, type Spring } from '../physics/spring'
import type { GlassMemberOptions } from './context'
import { boundsOf, glassPaths, type GlassRect, type GlassShape } from './geometry'
import { DEFAULT_GLASS_LIGHT, glassLightToward, rimGradient, type GlassLight } from './light'
import { planGlassTransition, sameRect } from './transitions'
import { adaptiveGlassTone, backdropTone, type BackdropSample, type GlassTone } from './adaptive'
import { GLASS_CONTENT_FOLLOW, GLASS_PRESS_SCALE, glassStretch, pressedShape } from './press'

/** How far (px) the material may reach past the container, for overshoot and growing bubbles. */
export const GLASS_MARGIN = 32
const SPRING: Spring = SPRINGS.snappy
const SVG = 'http://www.w3.org/2000/svg'

type Member = { element: HTMLElement; options: GlassMemberOptions }

/** One bubble's glass: an animated rect, its corner radius and, while alive, its element. */
class Shape {
  x: MotionValue
  y: MotionValue
  width: MotionValue
  height: MotionValue
  scale: MotionValue
  /** Press response: swell and stretch toward a dragging finger. */
  press = new MotionValue(1, 0.0005)
  stretchX = new MotionValue(0, 0.05)
  stretchY = new MotionValue(0, 0.05)
  radius = 0
  layout: GlassRect | null = null
  /** Translation written to the element so its content rides with the glass. */
  offset = { x: 0, y: 0 }
  /** Content follows the glass only for moves of the same bubble, not while growing out of another. */
  carry = true
  leaving = false
  token = 0

  constructor(rect: GlassRect, scale = 1) {
    this.x = new MotionValue(rect.x, 0.05)
    this.y = new MotionValue(rect.y, 0.05)
    this.width = new MotionValue(rect.width, 0.05)
    this.height = new MotionValue(rect.height, 0.05)
    this.scale = new MotionValue(scale, 0.001)
  }

  rect(): GlassRect {
    return { x: this.x.get(), y: this.y.get(), width: this.width.get(), height: this.height.get() }
  }

  /** The rect drawn this frame (scaled around its centre while materializing). */
  visual(): GlassShape {
    const s = Math.max(0, this.scale.get())
    const w = this.width.get() * s
    const h = this.height.get() * s
    const base = {
      x: this.x.get() + (this.width.get() - w) / 2,
      y: this.y.get() + (this.height.get() - h) / 2,
      width: w,
      height: h,
      radius: this.radius * s,
    }
    return pressedShape(base, this.press.get(), this.stretchX.get(), this.stretchY.get())
  }

  values() {
    return [this.x, this.y, this.width, this.height, this.scale, this.press, this.stretchX, this.stretchY]
  }

  set(rect: GlassRect) {
    this.x.set(rect.x)
    this.y.set(rect.y)
    this.width.set(rect.width)
    this.height.set(rect.height)
  }

  animate(rect: GlassRect, instant: boolean) {
    return Promise.all([
      this.x.animateTo(rect.x, { spring: SPRING, instant }),
      this.y.animateTo(rect.y, { spring: SPRING, instant }),
      this.width.animateTo(rect.width, { spring: SPRING, instant }),
      this.height.animateTo(rect.height, { spring: SPRING, instant }),
    ]).then((done) => done.every(Boolean))
  }
}

const radiusOf = (element: HTMLElement) => {
  const value = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
  return Number.isFinite(value) ? value : 0
}

/**
 * The engine behind GlassContainer: tracks bubbles, springs their glass between layouts, plans
 * splits and merges, and paints one material (a backdrop clipped to the blended outline, plus an
 * SVG for edge, light and shadow). DOM-only; React just hands it elements.
 */
export class GlassScene {
  private members = new Map<string, Member>()
  private shapes = new Map<string, Shape>()
  private measured = false
  private measureQueued = false
  private drawHook: (() => void) | null = null
  private dirty = false
  private resize: ResizeObserver | null = null
  private mutations: MutationObserver | null = null
  private pointer: { x: number; y: number } | null = null
  private cache = { key: '', paths: [] as ReturnType<typeof glassPaths> }
  private uid: string
  private pressed: { id: string; pointer: number; x: number; y: number } | null = null
  private glow: { x: number; y: number; radius: MotionValue; opacity: MotionValue } | null = null
  spacing = 8
  reduceMotion = false
  followPointer = true
  /** Bubbles swell, stretch and glow under a press (Apple's interactive glass). */
  interactive = true
  /** Small glass flips light/dark to stay legible over what is behind it. */
  adaptive = true
  private sampleFrame = 0
  private themeObserver: MutationObserver | null = null
  private visibility: IntersectionObserver | null = null
  private sampleTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private host: HTMLElement,
    private backdrop: HTMLElement,
    private paint: SVGSVGElement,
    private shadow: SVGSVGElement,
    uid: string
  ) {
    this.uid = uid.replace(/[^a-zA-Z0-9_-]/g, '')
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.measure())
      this.resize.observe(host)
    }
    if (typeof MutationObserver !== 'undefined') {
      // Bubbles hidden with `inert` (collapsed toolbars, search taking over) leave the glass.
      this.mutations = new MutationObserver(() => this.requestMeasure())
      this.mutations.observe(host, { subtree: true, attributes: true, attributeFilter: ['inert', 'hidden'] })
    }
    host.addEventListener('pointerdown', this.onPressStart, { passive: true })
    window.addEventListener('scroll', this.requestSample, { passive: true, capture: true })
    if (typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(this.requestSample)
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lab-theme'] })
    }
    // Content can change behind still glass (a photo loads, a tab switches): re-check twice a
    // second, only while the glass is on screen and the page visible.
    if (typeof IntersectionObserver !== 'undefined') {
      this.visibility = new IntersectionObserver(([entry]) => {
        if (this.sampleTimer) clearInterval(this.sampleTimer)
        this.sampleTimer = entry?.isIntersecting
          ? setInterval(() => {
              if (this.adaptive && document.visibilityState === 'visible') this.requestSample()
            }, 500)
          : null
      })
      this.visibility.observe(host)
    }
  }

  /** Re-reads what is behind the glass on the next frame (scroll, theme or layout changed). */
  requestSample = () => {
    if (this.sampleFrame || typeof requestAnimationFrame === 'undefined') return
    this.sampleFrame = requestAnimationFrame(() => {
      this.sampleFrame = 0
      this.sampleBackdrop()
    })
  }

  private sampleBackdrop() {
    const paths = this.cache.paths
    let tone: GlassTone | null = null
    if (this.adaptive && paths.length && typeof document.elementsFromPoint === 'function') {
      const origin = this.host.getBoundingClientRect()
      const tones = paths.map((path) => {
        const x = origin.left - GLASS_MARGIN + path.bounds.x + path.bounds.width / 2
        const y = origin.top - GLASS_MARGIN + path.bounds.y + path.bounds.height / 2
        const samples: BackdropSample[] = document
          .elementsFromPoint(x, y)
          .filter((element) => !this.host.contains(element))
          .map((element) => ({
            tone: element.closest('[data-lab-backdrop]')?.getAttribute('data-lab-backdrop') as GlassTone | null,
            color: getComputedStyle(element).backgroundColor,
          }))
        return backdropTone(samples)
      })
      const mode: GlassTone = document.documentElement.getAttribute('data-lab-theme') === 'dark' ? 'dark' : 'light'
      tone = adaptiveGlassTone(tones, mode, Math.max(...paths.map((path) => path.bounds.height)))
    }
    if (tone) this.host.setAttribute('data-glass-backdrop', tone)
    else this.host.removeAttribute('data-glass-backdrop')
  }

  private onPressStart = (event: PointerEvent) => {
    if (!this.interactive || this.reduceMotion || event.button > 0 || this.pressed) return
    const target = event.target as Element | null
    if (!target || target.closest('input, textarea, select, [contenteditable="true"]')) return
    const element = target.closest<HTMLElement>('[data-glass-member]')
    const id = element && [...this.members].find(([, member]) => member.element === element)?.[0]
    const shape = id ? this.shapes.get(id) : undefined
    if (!id || !shape || shape.leaving) return
    this.pressed = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY }
    // Large surfaces (docks, panels) glow but don't swell.
    if (shape.height.get() <= 64) void shape.press.animateTo(GLASS_PRESS_SCALE, { spring: SPRING })
    const origin = this.host.getBoundingClientRect()
    const glow = { x: event.clientX - origin.left, y: event.clientY - origin.top, radius: new MotionValue(8, 0.5), opacity: new MotionValue(1, 0.005) }
    this.glow = glow
    void glow.radius.animateTo(Math.max(120, shape.width.get()), { spring: SPRINGS.smooth })
    window.addEventListener('pointermove', this.onPressMove, { passive: true })
    window.addEventListener('pointerup', this.onPressEnd, { passive: true })
    window.addEventListener('pointercancel', this.onPressEnd, { passive: true })
    this.scheduleDraw()
  }

  private onPressMove = (event: PointerEvent) => {
    const pressed = this.pressed
    if (!pressed || event.pointerId !== pressed.pointer) return
    const shape = this.shapes.get(pressed.id)
    if (!shape) return
    const stretch = glassStretch(event.clientX - pressed.x, event.clientY - pressed.y)
    shape.stretchX.track(stretch.x, event.timeStamp)
    shape.stretchY.track(stretch.y, event.timeStamp)
    if (this.glow) {
      const origin = this.host.getBoundingClientRect()
      this.glow.x = event.clientX - origin.left
      this.glow.y = event.clientY - origin.top
    }
    this.scheduleDraw()
  }

  private onPressEnd = (event: PointerEvent) => {
    const pressed = this.pressed
    if (!pressed || event.pointerId !== pressed.pointer) return
    this.pressed = null
    window.removeEventListener('pointermove', this.onPressMove)
    window.removeEventListener('pointerup', this.onPressEnd)
    window.removeEventListener('pointercancel', this.onPressEnd)
    const shape = this.shapes.get(pressed.id)
    if (shape) {
      void shape.press.animateTo(1, { spring: SPRINGS.bouncy })
      void shape.stretchX.animateTo(0, { spring: SPRINGS.bouncy })
      void shape.stretchY.animateTo(0, { spring: SPRINGS.bouncy })
    }
    const glow = this.glow
    if (glow)
      void glow.opacity.animateTo(0, { spring: SPRINGS.smooth }).then(() => {
        if (this.glow === glow) this.glow = null
        this.scheduleDraw()
      })
    this.scheduleDraw()
  }

  register(id: string, element: HTMLElement, options: GlassMemberOptions) {
    this.members.set(id, { element, options })
    this.resize?.observe(element)
    this.requestMeasure()
    return () => {
      if (this.members.get(id)?.element === element) this.members.delete(id)
      this.resize?.unobserve(element)
      this.requestMeasure()
    }
  }

  requestMeasure() {
    if (this.measureQueued) return
    this.measureQueued = true
    // Microtasks run after React's layout effects and before the browser paints.
    queueMicrotask(() => {
      this.measureQueued = false
      this.measure()
    })
  }

  setPointer(point: { x: number; y: number } | null) {
    this.pointer = point
    this.scheduleDraw()
  }

  dispose() {
    this.host.removeEventListener('pointerdown', this.onPressStart)
    window.removeEventListener('scroll', this.requestSample, { capture: true })
    this.themeObserver?.disconnect()
    this.visibility?.disconnect()
    if (this.sampleTimer) clearInterval(this.sampleTimer)
    if (this.sampleFrame) cancelAnimationFrame(this.sampleFrame)
    window.removeEventListener('pointermove', this.onPressMove)
    window.removeEventListener('pointerup', this.onPressEnd)
    window.removeEventListener('pointercancel', this.onPressEnd)
    this.resize?.disconnect()
    this.mutations?.disconnect()
    this.drawHook?.()
    for (const shape of this.shapes.values()) for (const value of shape.values()) value.stop()
  }

  /** Reads every bubble's layout box and moves the glass toward it. */
  measure() {
    const origin = this.host.getBoundingClientRect()
    const targets = new Map<string, { rect: GlassRect; radius: number; member: Member | null }>()
    const unions = new Map<string, GlassRect[]>()
    const unionRadius = new Map<string, number>()
    for (const [id, member] of this.members) {
      const { element, options } = member
      if (!element.isConnected || element.closest('[inert],[hidden]')) continue
      const box = element.getBoundingClientRect()
      if (!box.width || !box.height) continue
      const shape = this.shapes.get(id)
      const offset = shape?.offset ?? { x: 0, y: 0 }
      const rect = {
        x: box.left - origin.left - offset.x,
        y: box.top - origin.top - offset.y,
        width: box.width,
        height: box.height,
      }
      const radius = radiusOf(element)
      if (options.union) {
        const key = `union:${options.union}`
        unions.set(key, [...(unions.get(key) ?? []), rect])
        unionRadius.set(key, Math.min(unionRadius.get(key) ?? Infinity, radius))
      } else targets.set(id, { rect, radius, member })
    }
    for (const [key, rects] of unions) targets.set(key, { rect: boundsOf(rects), radius: unionRadius.get(key)!, member: null })

    const instant = this.reduceMotion || !this.measured
    const previous = new Map([...this.shapes].map(([id, shape]) => [id, shape.rect()]))
    const next = new Map([...targets].map(([id, target]) => [id, target.rect]))
    const plan = planGlassTransition(previous, next, this.spacing)
    for (const birth of plan.births) {
      const target = targets.get(birth.id)!
      const grow = birth.kind === 'grow' && !instant
      const shape = new Shape(grow ? birth.from : target.rect, grow || instant ? 1 : 0)
      shape.carry = !grow
      this.shapes.set(birth.id, shape)
      if (!instant && target.member) fadeIn(target.member.element)
    }
    for (const death of plan.deaths) {
      const shape = this.shapes.get(death.id)
      if (!shape || shape.leaving) continue
      shape.leaving = true
      shape.layout = null
      this.release(shape, death.id)
      const token = ++shape.token
      const done = () => {
        if (shape.token === token && shape.leaving) this.shapes.delete(death.id)
        this.scheduleDraw()
      }
      if (instant) this.shapes.delete(death.id)
      else if (death.kind === 'absorb') void shape.animate(death.into, false).then(done)
      else void shape.scale.animateTo(0, { spring: SPRING }).then(done)
    }
    for (const [id, target] of targets) {
      const shape = this.shapes.get(id)!
      shape.leaving = false
      shape.radius = target.radius
      const follow = target.member?.options.motion === 'follow'
      const changed = !shape.layout || !sameRect(shape.layout, target.rect)
      shape.layout = target.rect
      if (shape.scale.getTarget() !== 1) void shape.scale.animateTo(1, { spring: SPRING, instant })
      if (follow || instant) shape.set(target.rect)
      else if (changed || !sameRect(shape.rect(), target.rect)) {
        const token = ++shape.token
        void shape.animate(target.rect, false).then((arrived) => {
          if (arrived && shape.token === token) shape.carry = true
          this.scheduleDraw()
        })
      }
    }
    this.measured = true
    this.draw()
    this.scheduleDraw()
    this.requestSample()
  }

  private release(shape: Shape, id: string) {
    const member = this.members.get(id)
    if (member) member.element.style.translate = ''
    shape.offset = { x: 0, y: 0 }
  }

  private scheduleDraw() {
    this.dirty = true
    if (this.drawHook) return
    this.drawHook = onAnimationFrame(() => {
      const glow = this.glow
      const moving =
        [...this.shapes.values()].some((shape) => shape.values().some((v) => v.isAnimating())) ||
        (glow !== null && (glow.radius.isAnimating() || glow.opacity.isAnimating()))
      if (this.dirty || moving) {
        this.dirty = false
        this.draw()
      } else {
        this.drawHook?.()
        this.drawHook = null
      }
    })
  }

  /** Paints the current frame: element offsets, backdrop clip, edge, light and shadow. */
  draw() {
    const visuals: (GlassShape & { id: string })[] = []
    for (const [id, shape] of this.shapes) {
      visuals.push({ ...shape.visual(), id })
      const member = this.members.get(id)
      if (!member || shape.leaving || !shape.layout) continue
      // Content rides with its glass (centre to centre) while the bubble moves.
      const dx = shape.carry ? shape.x.get() + shape.width.get() / 2 - (shape.layout.x + shape.layout.width / 2) : 0
      const dy = shape.carry ? shape.y.get() + shape.height.get() / 2 - (shape.layout.y + shape.layout.height / 2) : 0
      const fx = dx + shape.stretchX.get() * GLASS_CONTENT_FOLLOW
      const fy = dy + shape.stretchY.get() * GLASS_CONTENT_FOLLOW
      const x = Math.abs(fx) < 0.05 ? 0 : fx
      const y = Math.abs(fy) < 0.05 ? 0 : fy
      if (x !== shape.offset.x || y !== shape.offset.y) {
        member.element.style.translate = x || y ? `${x}px ${y}px` : ''
        shape.offset = { x, y }
      }
      const press = shape.press.get()
      member.element.style.scale = Math.abs(press - 1) < 0.001 ? '' : String(press)
    }
    const m = GLASS_MARGIN
    const placed = visuals.map((v) => ({ ...v, x: v.x + m, y: v.y + m }))
    const key = `${this.spacing}|${placed.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.width.toFixed(1)},${v.height.toFixed(1)},${v.radius.toFixed(1)}`).join(';')}`
    if (key !== this.cache.key) this.cache = { key, paths: glassPaths(placed, this.spacing) }
    const paths = this.cache.paths
    const d = paths.map((p) => p.d).join('')
    this.backdrop.style.clipPath = d ? `path("${d}")` : 'inset(50%)'

    const origin = this.host.getBoundingClientRect()
    const lights = paths.map((p) => this.lightFor(p.bounds, origin))
    const glow = this.glow
    renderPaint(
      this.paint,
      paths,
      lights,
      this.uid,
      glow ? { x: glow.x + m, y: glow.y + m, radius: glow.radius.get(), opacity: glow.opacity.get() } : null
    )
    renderShadow(this.shadow, d, this.uid)
    this.host.toggleAttribute('data-glass-ready', true)
  }

  private lightFor(bounds: GlassRect, origin: DOMRect): GlassLight {
    if (!this.followPointer || this.reduceMotion || !this.pointer) return DEFAULT_GLASS_LIGHT
    const centre = {
      x: origin.left - GLASS_MARGIN + bounds.x + bounds.width / 2,
      y: origin.top - GLASS_MARGIN + bounds.y + bounds.height / 2,
    }
    return glassLightToward(centre, this.pointer)
  }
}

function fadeIn(element: HTMLElement) {
  element.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 80, easing: 'ease-out', fill: 'backwards' })
}

const node = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(SVG, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value))
  return el
}

/** Edge and light, one clipped group per cluster so each bubble is lit on its own. */
function renderPaint(
  svg: SVGSVGElement,
  paths: ReturnType<typeof glassPaths>,
  lights: GlassLight[],
  uid: string,
  glow: { x: number; y: number; radius: number; opacity: number } | null
) {
  const defs = node('defs', {})
  const parts: SVGElement[] = [defs]
  paths.forEach((path, i) => {
    const clip = node('clipPath', { id: `${uid}-c${i}` })
    clip.append(node('path', { d: path.d }))
    const g = rimGradient(path.bounds, lights[i])
    const gradient = node('linearGradient', { id: `${uid}-g${i}`, gradientUnits: 'userSpaceOnUse', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 })
    for (const [offset, stop] of [
      [0, 'lab-glass-stop-light'],
      [0.22, 'lab-glass-stop-low'],
      [0.48, 'lab-glass-stop-none'],
      [0.72, 'lab-glass-stop-none'],
      [1, 'lab-glass-stop-low'],
    ] as const)
      gradient.append(node('stop', { offset, class: stop }))
    defs.append(clip, gradient)
    const group = node('g', { 'clip-path': `url(#${uid}-c${i})` })
    group.append(
      node('path', { d: path.d, class: 'lab-glass-edge' }),
      node('path', { d: path.d, class: 'lab-glass-rim', stroke: `url(#${uid}-g${i})` })
    )
    parts.push(group)
  })
  if (glow && glow.opacity > 0.01 && paths.length) {
    // Light from under the finger, spilling onto every bubble it reaches (clipped to all glass).
    const clip = node('clipPath', { id: `${uid}-gc` })
    clip.append(node('path', { d: paths.map((p) => p.d).join('') }))
    const gradient = node('radialGradient', { id: `${uid}-gg`, gradientUnits: 'userSpaceOnUse', cx: glow.x, cy: glow.y, r: Math.max(1, glow.radius) })
    gradient.append(node('stop', { offset: 0, class: 'lab-glass-glow-stop' }), node('stop', { offset: 1, class: 'lab-glass-glow-stop', 'stop-opacity': 0 }))
    defs.append(clip, gradient)
    const group = node('g', { 'clip-path': `url(#${uid}-gc)`, opacity: glow.opacity })
    group.append(node('circle', { cx: glow.x, cy: glow.y, r: Math.max(1, glow.radius), fill: `url(#${uid}-gg)` }))
    parts.push(group)
  }
  svg.replaceChildren(...parts)
}

/** A soft shadow outside the glass only (masked), like CSS box-shadow. */
function renderShadow(svg: SVGSVGElement, d: string, uid: string) {
  if (!d) {
    svg.replaceChildren()
    return
  }
  const defs = node('defs', {})
  const mask = node('mask', { id: `${uid}-m`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: '100%', height: '100%' })
  mask.append(node('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'white' }), node('path', { d, fill: 'black' }))
  const blur = node('filter', { id: `${uid}-b`, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: '100%', height: '100%' })
  blur.append(node('feGaussianBlur', { stdDeviation: 7 }))
  defs.append(mask, blur)
  const group = node('g', { mask: `url(#${uid}-m)` })
  group.append(node('path', { d, class: 'lab-glass-shadow-shape', transform: 'translate(0 6)', filter: `url(#${uid}-b)` }))
  svg.replaceChildren(defs, group)
}
