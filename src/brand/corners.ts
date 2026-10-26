import { cornerFit, trueCornerRadius } from './corner-fit'
import { foSuperellipsePath, type FoCornerRadii } from './geometry'

const selector =
  '[data-lab-corners], :is([class^="lab-"], [class*=" lab-"]), .lab-app :is(button, a, input, textarea, select), .lab-presentation :is(button, a, input, textarea, select)'
const ownedProperties = [
  'background-color',
  'background-image',
  'background-size',
  'background-repeat',
  'background-position',
  'background-origin',
  'background-clip',
  'border-image-source',
  'border-image-slice',
  'border-image-width',
  'border-image-outset',
  'border-image-repeat',
  'border-color',
  'border-radius',
  'position',
  'isolation',
  '--lab-corner-clip',
  '--lab-corner-inner-clip',
  '--lab-corner-rim',
  '--lab-corner-mask',
]
type InlineValue = { value: string; priority: string }
type CornerEntry = {
  original: Map<string, InlineValue>
  applied: Map<string, InlineValue>
  layer?: HTMLSpanElement
  appliedStyle?: string | null
}
const svgImage = (width: number, height: number, content: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`)}")`
const escape = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const inlineValue = (host: HTMLElement, property: string): InlineValue => ({
  value: host.style.getPropertyValue(property),
  priority: host.style.getPropertyPriority(property),
})
const equal = (a: InlineValue, b?: InlineValue) =>
  a.value === b?.value && a.priority === b?.priority
const restore = (host: HTMLElement, property: string, value: InlineValue) => {
  if (value.value) host.style.setProperty(property, value.value, value.priority)
  else host.style.removeProperty(property)
}
const radius = (value: string, width: number, height: number, fit: number) => {
  const [horizontal, vertical = horizontal] = value.split(' ')
  const length = (part: string, size: number) =>
    part.endsWith('%') ? (Number.parseFloat(part) * size) / 100 : trueCornerRadius(Number.parseFloat(part) || 0, width, height, fit)
  return { x: length(horizontal, width), y: length(vertical, height) }
}

/**
 * Optional SVG fallback for browsers without native corner-shape support.
 * Provider leaves this engine disabled unless enableCornerFallback is true.
 * Interactive hosts are never clipped; cleanup restores their original paint.
 */
export function installFoContinuousCorners(root?: Document | HTMLElement) {
  if (typeof window === 'undefined') return () => {}
  if (CSS.supports('corner-shape', 'superellipse(1.5)')) return () => {}
  const cornerRoot = root ?? document
  const entries = new Map<HTMLElement, CornerEntry>()
  const dirty = new Set<HTMLElement>()
  const scope = cornerRoot instanceof Document ? cornerRoot.documentElement : cornerRoot
  let frame = 0
  let dead = false
  let scanNeeded = true

  function set(
    host: HTMLElement,
    entry: CornerEntry,
    property: string,
    value: string,
    priority = 'important'
  ) {
    host.style.setProperty(property, value, priority)
    entry.applied.set(property, inlineValue(host, property))
  }

  function remove(host: HTMLElement, entry: CornerEntry) {
    observer.unobserve(host)
    entry.layer?.remove()
    entry.applied.forEach((applied, property) => {
      // Do not erase a newer React style written since the last paint.
      if (equal(inlineValue(host, property), applied))
        restore(host, property, entry.original.get(property)!)
    })
    entries.delete(host)
    dirty.delete(host)
  }

  function paint(host: HTMLElement, entry: CornerEntry) {
    // Read CSS afresh on state/class changes, including hover and responsive rules.
    // Restore our overrides; external inline changes become the new source.
    // Reading an intermediate transition from our transparent paint override
    // would produce invisible hover backgrounds. Resolve the source immediately.
    const transition = inlineValue(host, 'transition')
    host.style.setProperty('transition', 'none', 'important')
    entry.applied.forEach((applied, property) => {
      const current = inlineValue(host, property)
      if (!equal(current, applied)) entry.original.set(property, current)
      restore(host, property, entry.original.get(property)!)
    })
    const style = getComputedStyle(host)
    const fit = cornerFit()
    const width = host.offsetWidth
    const height = host.offsetHeight
    const radii = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]
      // Smoothed CSS radii are shrunk to look right as circles (--lab-corner-fit, never a capsule's);
      // the SVG draws the real clamped continuous curve.
      .map((value) => radius(value, width, height, fit)) as FoCornerRadii
    const image = style.backgroundImage
    if (
      !width ||
      !height ||
      !radii.some((corner) => corner.x > 0 && corner.y > 0) ||
      (image !== 'none' && host.matches('input, textarea, select, img, video, canvas'))
    ) {
      entry.layer?.remove()
      entry.applied.clear()
      restore(host, 'transition', transition)
      entry.appliedStyle = host.getAttribute('style')
      return
    }
    const background = style.backgroundColor
    const border = style.borderTopColor
    const borderWidth = Number.parseFloat(style.borderTopWidth) || 0
    const position = style.position
    const backgroundStyle = style.background
    // An explicit --lab-corner-exponent applies to every corner; otherwise each corner is clamped.
    const exponent = Number.parseFloat(style.getPropertyValue('--lab-corner-exponent')) || undefined
    const path = foSuperellipsePath(width, height, radii, 0, exponent)
    const mask = svgImage(width, height, `<path fill="white" d="${path}"/>`)
    if (image === 'none') {
      // A filled SVG border image paints the entire box without circular
      // background clipping. Native border-radius remains available for rounded
      // focus outlines. It also works on scrolling dialogs and form controls.
      entry.layer?.remove()
      const inner = foSuperellipsePath(width, height, radii, borderWidth / 2, exponent)
      const paintImage = svgImage(
        width,
        height,
        `<path d="${inner}" fill="${escape(background)}" stroke="${escape(border)}" stroke-width="${borderWidth}"/>`
      )
      set(host, entry, 'background-image', 'none')
      set(host, entry, 'border-image-source', paintImage)
      set(host, entry, 'border-image-slice', '0 fill')
      set(host, entry, 'border-image-width', '0')
      set(host, entry, 'border-image-outset', '0')
      set(host, entry, 'border-image-repeat', 'stretch')
      // Firefox otherwise clips scrolling dialog and pane contents with a circular curve
      // inside the superellipse paint, leaving a crescent around nested panels.
      if (host.matches('.lab-modal, .lab-pane, .lab-upgrade-art')) set(host, entry, 'border-radius', '0')
    } else {
      // Preserve CSS gradients/images on a separate masked paint layer. No
      // pseudo-element slots are consumed and no content is wrapped or moved.
      const layer = entry.layer ?? (entry.layer = document.createElement('span'))
      layer.dataset.labCornerLayer = ''
      layer.setAttribute('aria-hidden', 'true')
      layer.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;display:block;'
      layer.style.inset = `-${borderWidth}px`
      layer.style.background = backgroundStyle
      const borderPath = foSuperellipsePath(width, height, radii, borderWidth / 2, exponent)
      const borderImage = svgImage(
        width,
        height,
        `<path d="${borderPath}" fill="none" stroke="${escape(border)}" stroke-width="${borderWidth}"/>`
      )
      layer.style.backgroundImage = `${borderImage}, ${image}`
      layer.style.backgroundSize = `100% 100%, ${style.backgroundSize}`
      layer.style.backgroundPosition = `0 0, ${style.backgroundPosition}`
      layer.style.backgroundRepeat = `no-repeat, ${style.backgroundRepeat}`
      layer.style.maskImage = mask
      layer.style.maskSize = '100% 100%'
      layer.style.maskRepeat = 'no-repeat'
      if (layer.parentElement !== host) host.append(layer)
      set(host, entry, 'background-image', 'none')
      if (position === 'static') set(host, entry, 'position', 'relative')
      set(host, entry, 'isolation', 'isolate')
      // This branch uses its own mask so native circular overflow clipping must
      // not trim gradient pixels. Interactive solid controls retain their radius.
      set(host, entry, 'border-radius', '0')
    }
    set(host, entry, 'background-color', 'transparent')
    set(host, entry, 'border-color', 'transparent')
    set(host, entry, '--lab-corner-clip', `path('${path}')`, '')
    const innerRadii = radii.map((corner) => ({
      x: Math.max(0, corner.x - 1),
      y: Math.max(0, corner.y - 1),
    })) as FoCornerRadii
    const innerClip = foSuperellipsePath(
      Math.max(0, width - 2),
      Math.max(0, height - 2),
      innerRadii,
      0,
      exponent
    )
    set(host, entry, '--lab-corner-inner-clip', `path('${innerClip}')`, '')
    rim(host, entry, width, height, radii, exponent)
    set(host, entry, '--lab-corner-mask', mask, '')
    // Commit transparent paint before restoring transitions, otherwise Firefox
    // briefly paints the old rectangular background while fading to transparent.
    void getComputedStyle(host).backgroundColor
    restore(host, 'transition', transition)
    entry.appliedStyle = host.getAttribute('style')
  }
  function rim(
    host: HTMLElement,
    entry: CornerEntry,
    width: number,
    height: number,
    radii: FoCornerRadii,
    exponent: number | undefined
  ) {
    const inner = radii.map((corner) => ({
      x: Math.max(0, corner.x - 1),
      y: Math.max(0, corner.y - 1),
    })) as FoCornerRadii
    const w = Math.max(1, width - 2)
    const h = Math.max(1, height - 2)
    set(
      host,
      entry,
      '--lab-corner-rim',
      svgImage(
        w,
        h,
        `<path d="${foSuperellipsePath(w, h, inner, 0.5, exponent)}" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="1"/>`
      ),
      ''
    )
  }
  function sync() {
    frame = 0
    if (dead) return
    entries.forEach((entry, host) => {
      if (!host.isConnected || !scope.contains(host) || host.dataset.labCorners === 'off')
        remove(host, entry)
    })
    if (scanNeeded) {
      scanNeeded = false
      const candidates = [...cornerRoot.querySelectorAll<HTMLElement>(selector)]
      if (cornerRoot instanceof HTMLElement && cornerRoot.matches(selector))
        candidates.unshift(cornerRoot)
      candidates.forEach((host) => {
        if (
          entries.has(host) ||
          host.closest('[data-lab-corner-layer], svg') ||
          host.matches(
            '[data-lab-corners="off"], [type="range"], [type="checkbox"], [type="radio"], .lab-edge-glow, .lab-feature-band__track'
          )
        )
          return
        const style = getComputedStyle(host)
        if (!(Number.parseFloat(style.borderTopLeftRadius) > 0) || style.clipPath !== 'none') return
        const entry: CornerEntry = {
          original: new Map(
            ownedProperties.map((property) => [property, inlineValue(host, property)])
          ),
          applied: new Map(),
        }
        entries.set(host, entry)
        observer.observe(host)
        dirty.add(host)
      })
    }
    dirty.forEach((host) => {
      const entry = entries.get(host)
      if (entry) paint(host, entry)
    })
    dirty.clear()
  }
  function schedule(scan = false) {
    scanNeeded ||= scan
    if (!dead && !frame) frame = requestAnimationFrame(sync)
  }
  const observer = new ResizeObserver((items) => {
    items.forEach((item) => {
      const host = item.target as HTMLElement
      // A sheet drag changes height every frame. Repainting corners then stalls the gesture.
      if (host.dataset.dragging === 'true') return
      dirty.add(host)
    })
    if (dirty.size) schedule()
  })
  const mutations = new MutationObserver((records) => {
    let scan = false
    for (const record of records) {
      const target = record.target
      if (!(target instanceof HTMLElement) || target.closest('[data-lab-corner-layer]')) continue
      if (target.closest('[data-dragging="true"]')) continue
      const entry = entries.get(target)
      if (
        record.type === 'attributes' &&
        record.attributeName === 'style' &&
        entry?.appliedStyle === target.getAttribute('style')
      )
        continue
      if (
        record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].every(
          (node) => node instanceof HTMLElement && node.hasAttribute('data-lab-corner-layer')
        )
      )
        continue
      scan = true
      if (entry) dirty.add(target)
      // Ancestor class changes can alter every descendant's CSS.
      if (record.type === 'attributes')
        entries.forEach((_, host) => {
          if (target.contains(host)) dirty.add(host)
        })
    }
    if (scan || dirty.size) schedule(scan)
  })
  mutations.observe(scope, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'data-lab-corners',
      'data-lab-theme',
      'disabled',
      'aria-expanded',
      'aria-pressed',
      'data-variant',
      'data-control-appearance',
      'data-control-size',
      'data-state',
    ],
  })
  const stateChange = (event: Event) => {
    if (!(event.target instanceof Element)) return
    entries.forEach((_, host) => {
      if (host.contains(event.target as Node) || (event.target as Element).contains(host))
        dirty.add(host)
    })
    schedule()
  }
  const events = [
    'pointerover',
    'pointerout',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'keydown',
    'keyup',
    'focusin',
    'focusout',
    'transitionend',
  ]
  events.forEach((event) => scope.addEventListener(event, stateChange, true))
  const resize = () => {
    entries.forEach((_, host) => dirty.add(host))
    schedule()
  }
  window.addEventListener('resize', resize)
  sync()
  return () => {
    dead = true
    cancelAnimationFrame(frame)
    mutations.disconnect()
    observer.disconnect()
    events.forEach((event) => scope.removeEventListener(event, stateChange, true))
    window.removeEventListener('resize', resize)
    entries.forEach((entry, host) => remove(host, entry))
  }
}
