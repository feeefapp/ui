import type { GlassShape } from './geometry'
import { lensMaterial } from './material'
import { LENS_SOFT, lensDisplacementMap, rgbaBmpDataUrl, supportsRefraction, type LensKind } from './refraction'

/**
 * The real glass of a control's lens: the moving part of a slider, a switch, a segmented control or
 * a tab bar, pressed or dragged (lens.css `.lab-lens`), as iOS 26.2 draws it (research/liquid-glass/
 * LENS-MEASURED.md). The twin of Flutter's `GlassLens`. Clear: never blurred, lifted or magnified;
 * the measured veil and shade (`lensMaterial`), the rim light, the shadow and the touch glow, all
 * eased in by the lens amount. Liquid glass also bends what is behind it (`lensBend`) through an
 * SVG backdrop filter where the browser can (`supportsRefraction`, Chromium), every colour by the
 * same shift: Chromium samples whole device pixels, so a per-channel split turns into coloured
 * fringes on everything behind the lens. Transparent glass and other browsers keep the clear lens unbent. Solid glass, reduced
 * transparency, more contrast and forced colours show no lens: owners keep their rest paint.
 *
 * The element must sit above what it should bend (the track, the labels).
 */

/** What a lens is under the current theme and system settings. */
export type LensMode = 'liquid' | 'transparent' | 'off'

const SVG = 'http://www.w3.org/2000/svg'
const PLAIN_QUERY = '(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)'
let plainQuery: MediaQueryList | null | undefined

/** The lens mode from `<html data-lab-glass>` and the user's transparency and contrast settings. */
export function lensMode(): LensMode {
  if (typeof document === 'undefined') return 'off'
  if (plainQuery === undefined) plainQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PLAIN_QUERY) : null
  if (plainQuery?.matches) return 'off'
  const glass = document.documentElement.getAttribute('data-lab-glass')
  return glass === 'solid' ? 'off' : glass === 'transparent' ? 'transparent' : 'liquid'
}

/** Whether lenses bend what is behind them: liquid, with the theme's refraction on, in a browser
 * whose backdrop filters bend (Chromium). */
export function lensBends() {
  return (
    lensMode() === 'liquid' &&
    document.documentElement.getAttribute('data-lab-glass-refraction') !== 'off' &&
    supportsRefraction()
  )
}

/** Lens maps by quantised geometry, shared by every lens (a drag revisits the same widths). */
const MAPS_KEPT = 64
const maps = new Map<string, { scale: number; href: string }>()
function lensMap(width: number, height: number, radius: number, kind: LensKind, lift: { x: number; y: number }) {
  const key = `${width}|${height}|${radius}|${kind}|${lift.x}|${lift.y}`
  let map = maps.get(key)
  if (map) maps.delete(key)
  else {
    const pixels = lensDisplacementMap({ x: 0, y: 0, width, height, radius }, kind, lift)
    map = { scale: pixels.scale, href: rgbaBmpDataUrl(pixels.width, pixels.height, pixels.data) }
  }
  maps.set(key, map)
  if (maps.size > MAPS_KEPT) maps.delete(maps.keys().next().value!)
  return map
}

/** Maps are cut on this grid (px): a moving lens reuses its neighbours' maps, stretched to fit. */
const MAP_GRID = 2

let filterHost: SVGSVGElement | null = null
let filterCount = 0

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const el = document.createElementNS(SVG, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value))
  return el
}

function setAttribute(element: Element, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function setProperty(style: CSSStyleDeclaration, name: string, value: string) {
  if (style.getPropertyValue(name) !== value) style.setProperty(name, value)
}

/** One lens element's glass. `update` runs on every frame the lens moves; it touches only what changed. */
export class GlassLensLayer {
  private filter: SVGFilterElement | null = null
  private readonly id = `lab-lens-${++filterCount}`
  private measured: { width: number; height: number; radius: number } | null = null
  private observer: ResizeObserver | null = null
  private last: number | null = null

  /**
   * `measure`: the lens takes its size and corners from the element (a thumb's own box, which CSS
   * sizes), watched with a ResizeObserver. Otherwise every `update` passes the shape.
   */
  constructor(
    private readonly el: HTMLElement,
    private readonly kind: LensKind,
    measure = false
  ) {
    if (measure && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => {
        this.measure()
        if (this.last !== null) this.update(this.last)
      })
      this.observer.observe(el)
    }
  }

  private measure() {
    const width = this.el.offsetWidth
    const height = this.el.offsetHeight
    const radius = Number.parseFloat(getComputedStyle(this.el).borderTopLeftRadius) || 0
    this.measured = { width, height, radius }
  }

  /**
   * Shows the lens at `lens` (0 rest … 1 glass). `shape` is the lens's box in its own pixels (only
   * its size and radius count; owners place the element) unless the layer measures itself. A pill
   * passes `lift`, how far it reaches past its rest pill on each side: its bend follows that gap
   * (so it already eases in with the lift), a thumb's is scaled by `lens`.
   */
  update(lens: number, shape?: GlassShape, lift?: { x: number; y: number }) {
    this.last = lens
    const el = this.el
    const t = Number.isFinite(lens) ? Math.max(0, Math.min(1, lens)) : 0
    const mode = lensMode()
    if (t <= 0.001 || mode === 'off') {
      this.hide()
      return
    }
    if (!shape && !this.measured) this.measure()
    const size = shape ?? this.measured!
    if (!(size.width > 0 && size.height > 0)) {
      this.hide()
      return
    }
    el.removeAttribute('data-hidden')
    const tone = el.closest('[data-glass-backdrop]')?.getAttribute('data-glass-backdrop')
    const scheme =
      tone === 'light' || tone === 'dark'
        ? tone
        : document.documentElement.getAttribute('data-lab-theme') === 'dark'
          ? 'dark'
          : 'light'
    const material = lensMaterial(this.kind, t, scheme)
    const style = el.style
    setProperty(style, '--lab-lens-veil', material.veil.toFixed(4))
    setProperty(style, '--lab-lens-shade-top', material.shade.top.toFixed(4))
    setProperty(style, '--lab-lens-shade-middle', material.shade.middle.toFixed(4))
    setProperty(style, '--lab-lens-rim-top', material.rim.top.toFixed(4))
    setProperty(style, '--lab-lens-rim-side', material.rim.side.toFixed(4))
    setProperty(style, '--lab-lens-rim-bottom', material.rim.bottom.toFixed(4))
    setProperty(style, '--lab-lens-rim-edge-top', material.rimEdge.top.toFixed(4))
    setProperty(style, '--lab-lens-rim-edge-side', material.rimEdge.side.toFixed(4))
    setProperty(style, '--lab-lens-rim-edge-bottom', material.rimEdge.bottom.toFixed(4))
    setProperty(style, '--lab-lens-line', material.line.inner.toFixed(4))
    setProperty(style, '--lab-lens-line-outer', material.line.outer.toFixed(4))
    setProperty(style, '--lab-lens-line-bottom', material.line.bottom.toFixed(4))
    setProperty(style, '--lab-lens-shadow', material.shadow.toFixed(4))
    const radius = Math.min(size.radius, size.width / 2, size.height / 2)
    const value = mode === 'liquid' && lensBends() ? this.refraction(size.width, size.height, radius, t, lift) : null
    if (value) {
      setProperty(style, 'backdrop-filter', value)
      setProperty(style, '-webkit-backdrop-filter', value)
    } else {
      this.dropFilter()
      if (style.getPropertyValue('backdrop-filter')) {
        style.removeProperty('backdrop-filter')
        style.removeProperty('-webkit-backdrop-filter')
      }
    }
  }

  /** The SVG backdrop filter: the bend, cut to the shape. */
  private refraction(width: number, height: number, radius: number, t: number, lift?: { x: number; y: number }) {
    if (!filterHost || !filterHost.isConnected) {
      filterHost = node('svg', { 'width': 0, 'height': 0, 'aria-hidden': 'true', 'class': 'lab-lens-filters' }) as SVGSVGElement
      filterHost.style.position = 'absolute'
      filterHost.style.pointerEvents = 'none'
      document.body.append(filterHost)
    }
    let filter = this.filter
    if (!filter || !filter.isConnected) {
      filter = node('filter', { 'id': this.id, 'color-interpolation-filters': 'sRGB', 'filterUnits': 'userSpaceOnUse', 'x': 0, 'y': 0 }) as SVGFilterElement
      filter.append(
        node('feImage', { result: 'map', preserveAspectRatio: 'none', x: 0, y: 0 }),
        node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: 0, result: 'bent' }),
        // A slider thumb softens its edge band: the backdrop blurred, then bent like the rest (its band
        // magnifies, so blurring after the bend would soften nothing), where the map's blue says so.
        ...(this.kind === 'thumb'
          ? [
              node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: LENS_SOFT.blur, edgeMode: 'duplicate', result: 'blurred' }),
              node('feDisplacementMap', { 'in': 'blurred', 'in2': 'map', 'xChannelSelector': 'R', 'yChannelSelector': 'G', 'scale': 0, 'result': 'bentBlurred', 'data-lens-soft': '' }),
              node('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0', result: 'band' }),
              node('feComposite', { in: 'bentBlurred', in2: 'band', operator: 'in', result: 'soft' }),
              node('feComposite', { in: 'soft', in2: 'bent', operator: 'over', result: 'bent' }),
            ]
          : []),
        // Chromium ignores clip-path on an SVG backdrop filter: the map's alpha cuts the shape.
        node('feComposite', { in: 'bent', in2: 'map', operator: 'in' })
      )
      filterHost.append(filter)
      this.filter = filter
    }
    const grid = (value: number) => Math.max(MAP_GRID, Math.round(value / MAP_GRID) * MAP_GRID)
    const mapWidth = grid(width)
    const mapHeight = grid(height)
    const pill = this.kind === 'pill'
    // Quantised like the map's size: a moving lens reuses its neighbours' maps.
    const gap = { x: pill ? Math.round(lift?.x ?? 0) : 0, y: pill ? Math.round(lift?.y ?? 0) : 0 }
    const map = lensMap(mapWidth, mapHeight, Math.round(Math.min(radius * (mapHeight / height), mapWidth / 2, mapHeight / 2)), this.kind, gap)
    const [image, bend] = Array.from(filter.children)
    for (const element of [filter, image]) {
      setAttribute(element, 'width', width.toFixed(2))
      setAttribute(element, 'height', height.toFixed(2))
    }
    setAttribute(image, 'href', map.href)
    // A pill's bend eases in with its lift (in the map); a thumb's scales with the lens.
    const scale = pill ? map.scale : map.scale * t
    setAttribute(bend, 'scale', scale.toFixed(2))
    const soft = filter.querySelector('[data-lens-soft]')
    if (soft) setAttribute(soft, 'scale', scale.toFixed(2))
    return `url(#${this.id})`
  }

  private hide() {
    if (!this.el.hasAttribute('data-hidden')) this.el.setAttribute('data-hidden', '')
    const style = this.el.style
    if (style.getPropertyValue('backdrop-filter')) {
      style.removeProperty('backdrop-filter')
      style.removeProperty('-webkit-backdrop-filter')
    }
  }

  private dropFilter() {
    this.filter?.remove()
    this.filter = null
  }

  dispose() {
    this.observer?.disconnect()
    this.observer = null
    this.dropFilter()
    this.hide()
  }
}
