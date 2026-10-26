import type { GlassShape } from './geometry'
import { lensMaterial, liftFilter } from './material'
import { lensDisplacementMap, rgbaBmpDataUrl, supportsRefraction } from './refraction'

/**
 * The real glass of a control's lens: the moving part of a slider, a switch, a segmented control or
 * a tab bar, pressed or dragged (lens.css `.lab-lens`). The twin of Flutter's `GlassLens`: the
 * backdrop at clear glass's tint (`lensMaterial`: saturation and lift eased in by the lens amount),
 * never blurred, the rim light, the exterior hairline and the touch glow. Liquid glass bends at the
 * rim and magnifies what it covers through an SVG backdrop filter where the browser can
 * (`supportsRefraction`, Chromium); elsewhere, and for transparent glass, the lens is a plain clear
 * lens (CSS filters). Solid glass, reduced transparency, more contrast and forced colours show no
 * lens: owners keep their rest paint.
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

/** Whether lenses magnify for real: liquid, with the theme's refraction on, in a browser whose
 * backdrop filters bend (Chromium). Where they don't, a control may fake the enlargement itself. */
export function lensMagnifies() {
  return (
    lensMode() === 'liquid' &&
    document.documentElement.getAttribute('data-lab-glass-refraction') !== 'off' &&
    supportsRefraction()
  )
}

/** Lens maps by quantised geometry, shared by every lens (a drag revisits the same widths). */
const MAPS_KEPT = 64
const maps = new Map<string, { scale: number; href: string }>()
function lensMap(width: number, height: number, radius: number, magnify: number) {
  const key = `${width}|${height}|${radius}|${magnify}`
  let map = maps.get(key)
  if (map) maps.delete(key)
  else {
    const pixels = lensDisplacementMap({ x: 0, y: 0, width, height, radius }, magnify)
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
  private last: { lens: number; magnify: number } | null = null

  /**
   * `measure`: the lens takes its size and corners from the element (a thumb's own box, which CSS
   * sizes), watched with a ResizeObserver. Otherwise every `update` passes the shape.
   */
  constructor(
    private readonly el: HTMLElement,
    measure = false
  ) {
    if (measure && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => {
        this.measure()
        if (this.last) this.update(this.last.lens, this.last.magnify)
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
   * Shows the lens at `lens` (0 rest … 1 glass), magnifying by `magnify` at full lens (liquid glass
   * only; pass `LENS_MAGNIFY` or 0). `shape` is the lens's box in its own pixels (only its size and
   * radius count; owners place the element) unless the layer measures itself.
   */
  update(lens: number, magnify: number, shape?: GlassShape) {
    this.last = { lens, magnify }
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
    const material = lensMaterial(t, scheme)
    const { rim, hairline } = material
    const style = el.style
    // The rim light against the light axis (top left): lit at |cos| 1, half at 45°, w0 across it.
    setProperty(style, '--lab-lens-rim-peak', (rim.w0 + rim.w1).toFixed(4))
    setProperty(style, '--lab-lens-rim-mid', (rim.w0 + rim.w1 * Math.SQRT1_2 ** rim.p).toFixed(4))
    setProperty(style, '--lab-lens-rim-base', rim.w0.toFixed(4))
    setProperty(style, '--lab-lens-rim-width', `${rim.width.toFixed(2)}px`)
    setProperty(style, '--lab-lens-ring', hairline.ring.toFixed(4))
    setProperty(style, '--lab-lens-sliver', hairline.sliver.toFixed(4))
    const radius = Math.min(size.radius, size.width / 2, size.height / 2)
    const value = mode === 'liquid' && lensMagnifies() ? this.refraction(size.width, size.height, radius, magnify, t, material) : null
    if (value) {
      setProperty(style, 'backdrop-filter', value)
      setProperty(style, '-webkit-backdrop-filter', value)
    } else {
      this.dropFilter()
      const lift = liftFilter(material.gain, material.offset)
      const css = `saturate(${material.saturate.toFixed(4)}) contrast(${lift.contrast.toFixed(4)}) brightness(${lift.brightness.toFixed(4)})`
      setProperty(style, 'backdrop-filter', css)
      setProperty(style, '-webkit-backdrop-filter', css)
    }
  }

  /** The SVG backdrop filter: bend and magnify, saturate, lift, the edge, cut to the shape. */
  private refraction(
    width: number,
    height: number,
    radius: number,
    magnify: number,
    t: number,
    material: ReturnType<typeof lensMaterial>
  ) {
    if (!filterHost || !filterHost.isConnected) {
      filterHost = node('svg', { 'width': 0, 'height': 0, 'aria-hidden': 'true', 'class': 'lab-lens-filters' }) as SVGSVGElement
      filterHost.style.position = 'absolute'
      filterHost.style.pointerEvents = 'none'
      document.body.append(filterHost)
    }
    let filter = this.filter
    if (!filter || !filter.isConnected) {
      filter = node('filter', { 'id': this.id, 'color-interpolation-filters': 'sRGB', 'filterUnits': 'userSpaceOnUse', 'x': 0, 'y': 0 }) as SVGFilterElement
      const lift = node('feComponentTransfer', { in: 'tone', result: 'lifted' })
      for (const channel of ['feFuncR', 'feFuncG', 'feFuncB'] as const) lift.append(node(channel, { type: 'linear', slope: 1, intercept: 0 }))
      filter.append(
        node('feImage', { result: 'map', preserveAspectRatio: 'none', x: 0, y: 0 }),
        node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: 0, result: 'bent' }),
        node('feColorMatrix', { in: 'bent', type: 'saturate', values: 1, result: 'tone' }),
        lift,
        // The edge mask E (the map's blue) as grey: x + k1·x·E + k3·E (material.ts glassEdgeTerms).
        node('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 0 1', result: 'edge' }),
        node('feComposite', { in: 'lifted', in2: 'edge', operator: 'arithmetic', k1: 0, k2: 1, k3: 0, k4: 0, result: 'edged' }),
        // Chromium ignores clip-path on an SVG backdrop filter: the map's alpha cuts the shape.
        node('feComposite', { in: 'edged', in2: 'map', operator: 'in' })
      )
      filterHost.append(filter)
      this.filter = filter
    }
    const grid = (value: number) => Math.max(MAP_GRID, Math.round(value / MAP_GRID) * MAP_GRID)
    const mapWidth = grid(width)
    const mapHeight = grid(height)
    const map = lensMap(mapWidth, mapHeight, Math.round(Math.min(radius * (mapHeight / height), mapWidth / 2, mapHeight / 2)), Math.max(0, magnify))
    const [image, bent, tone, lift, , edged] = Array.from(filter.children)
    for (const element of [filter, image]) {
      setAttribute(element, 'width', width.toFixed(2))
      setAttribute(element, 'height', height.toFixed(2))
    }
    setAttribute(image, 'href', map.href)
    // The bend and the magnification both scale with the map's scale: the lens eases them in.
    setAttribute(bent, 'scale', (map.scale * t).toFixed(2))
    setAttribute(tone, 'values', material.saturate.toFixed(4))
    for (const channel of Array.from(lift.children)) {
      setAttribute(channel, 'slope', material.gain.toFixed(4))
      setAttribute(channel, 'intercept', material.offset.toFixed(4))
    }
    setAttribute(edged, 'k1', material.k1.toFixed(4))
    setAttribute(edged, 'k3', material.k3.toFixed(4))
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
