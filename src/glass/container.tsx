'use client'

import * as React from 'react'
import { cn } from '../utils'
import { useReducedMotion } from '../physics/react'
import { GlassContext, GlassBarContext, type GlassMemberOptions, type GlassRegistry } from './context'
import { GlassScene } from './scene'
import { clampGlassTint, GLASS_BAR_TINT, type GlassKind } from './material'
import type { GlassStyle } from '../theme-config'
import './glass.css'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/** A value read from `<html>`, live: `read` runs again whenever one of `attributes` changes. */
function useRootValue(attributes: string[], read: (root: HTMLElement) => string, fallback: string): string {
  return React.useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: attributes })
      return () => observer.disconnect()
    },
    () => read(document.documentElement),
    () => fallback
  )
}

/** The app's glass style (ThemeConfig `glass`, on `<html data-lab-glass>`), live. */
export function useGlassStyle(): GlassStyle {
  const value = useRootValue(['data-lab-glass'], (root) => root.getAttribute('data-lab-glass') ?? '', 'liquid')
  return value === 'transparent' || value === 'solid' ? value : 'liquid'
}

/**
 * The app's glass material options (ThemeConfig `glassTint`, `glassBlur`, `glassRefraction`, on
 * `<html>` as `--lab-glass-tint`, `data-lab-glass-blur` and `data-lab-glass-refraction`), live.
 */
export function useGlassOptions(): { tint: number; blur: boolean; refraction: boolean } {
  const blur = useRootValue(['data-lab-glass-blur'], (root) => root.getAttribute('data-lab-glass-blur') ?? '', 'off') === 'on'
  const refraction = useRootValue(['data-lab-glass-refraction'], (root) => root.getAttribute('data-lab-glass-refraction') ?? '', 'on') !== 'off'
  const tint = useRootValue(
    ['style'],
    // The inline variable (themeAttributes / applyThemeConfig), else the stylesheet's default.
    (root) => root.style.getPropertyValue('--lab-glass-tint') || getComputedStyle(root).getPropertyValue('--lab-glass-tint'),
    ''
  )
  return { tint: clampGlassTint(Number.parseFloat(tint)), blur, refraction }
}

type ContainerTag = 'div' | 'header' | 'footer' | 'nav' | 'section' | 'aside'

export type GlassContainerProps = React.HTMLAttributes<HTMLElement> & {
  /** Element to render; the container is the row itself and keeps your layout. */
  as?: ContainerTag
  /**
   * Distance in px at which bubbles start to bend toward each other; they join at half of it.
   * Keep it below the gap between bubbles at rest so separate bubbles stay apart. Default 8.
   */
  spacing?: number
  /**
   * Corner profile of the glass: `superellipse` (default) is the kit's clamped continuous corner,
   * so circle- and capsule-sized bubbles are circles and capsules and larger glass keeps the
   * continuous curve; `round` draws circular corners at every radius.
   */
  cornerShape?: 'superellipse' | 'round'
  /** `pointer` (default) turns the light toward a mouse or pen; `static` keeps it at the top-left. */
  light?: 'pointer' | 'static'
  /**
   * Bubbles respond to a press like Apple's interactive glass: they swell, stretch toward a
   * dragging finger, glow from the touch point onto nearby bubbles and spring back. Default true;
   * off with reduced motion.
   */
  interactive?: boolean
  /**
   * Small glass flips between light and dark to stay legible over what is behind it: a region
   * marked `data-lab-backdrop="dark|light"` (photos, video, maps) or the first solid background
   * colour. Glass taller than 72px never flips. Default true.
   */
  adaptive?: boolean
  /** Reflective bevel width in CSS px, 0–100; default 1. Small bubbles cap it to fit. */
  highlightWidth?: number
  /** `surface` uses a convex bevel; `rim` (default) uses the original thin, directional five-stop gradient. */
  highlightProfile?: 'surface' | 'rim'
  /** Local material tint, 0 clear–1 tinted (clear lifts what is behind it, clipping light content to white like iOS); omitted inherits ThemeConfig glassTint. */
  tint?: number
  /** Surface highlight opacity multiplier, 0–10; default 1. */
  highlightStrength?: number
  /** Backdrop bend multiplier, 0–10; default 1. Values above 1 allow stronger lens distortion. Still respects the theme’s refraction setting. */
  refractionStrength?: number
  /** `gentle` (default, iOS 27's lens: it never folds the backdrop back) or `measured` (the iOS 26.2 screenshot fit, with its mirrored band at the rim). */
  refractionProfile?: 'gentle' | 'measured'
  /** ID of a separate background-only element to sample live for Firefox refraction. Must not contain this container. */
  backdropSource?: string
  /**
   * `regular` (default) is the theme's glass. `menu` is the thick glass menus are made of
   * (`GLASS_MENU`: the full regular material veiled at least 88 %, blurred at least 20 px, with a
   * deeper shadow) so text on it reads over anything; the hairline, moving light and lens stay. It
   * ignores `tint` and never adapts its tone. MenuSurface uses it.
   */
  material?: GlassKind
  /**
   * The container is also its only bubble: a GlassGroup with no container around it paints the
   * same material this way instead of a fallback of its own.
   */
  solo?: { id?: string } & GlassMemberOptions
}

/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. The app's ThemeConfig `glass` sets the style: `liquid` (moving
 * light, press response, the bend), `transparent` (fixed light, no press, unbent) or `solid` (opaque); `glassTint`,
 * `glassBlur` and `glassRefraction` set the material. Bubbles that come within `spacing` bend toward each other and
 * merge; a bubble that splits into several grows them out of itself; a new bubble is born out of
 * its nearest neighbour (same row first) and a removed one is absorbed into it, so only a lone
 * bubble materializes. Bubbles keep their layout, focus and semantics; only the paint moves here. Without
 * JavaScript, or in forced colors, every bubble paints its own glass as before.
 */
export const GlassContainer = React.forwardRef<HTMLElement, GlassContainerProps>(function GlassContainer(
  { as = 'div', spacing = 8, cornerShape = 'superellipse', light = 'pointer', interactive = true, adaptive = true, highlightWidth = 1, highlightProfile = 'rim', highlightStrength = 1, refractionStrength = 1, refractionProfile = 'gentle', tint, backdropSource, material = 'regular', solo, className, children, ...props },
  ref
) {
  const host = React.useRef<HTMLElement | null>(null)
  const backdrop = React.useRef<HTMLDivElement>(null)
  const paint = React.useRef<SVGSVGElement>(null)
  const shadow = React.useRef<SVGSVGElement>(null)
  const scene = React.useRef<GlassScene | null>(null)
  const pending = React.useRef<(() => void)[]>([])
  const uid = React.useId()
  const autoSoloId = React.useId()
  const soloId = solo?.id ?? autoSoloId
  const reduced = useReducedMotion()
  const style = useGlassStyle()
  // The light effects tier (ThemeProvider, performance.ts): bubbles never merge, so no union
  // outline is traced on every frame they move.
  const lightTier = useRootValue(['data-lab-performance'], (root) => root.getAttribute('data-lab-performance') ?? '', '') === 'light'
  // Inside a GlassBar the theme tint is raised and the backdrop blurred (an explicit `tint` wins).
  const bar = React.useContext(GlassBarContext)
  tint ??= bar?.tint
  // Menu glass is always the full regular material under its veil.
  if (material === 'menu') tint = 1
  const options = useGlassOptions()
  const liquid = style === 'liquid'

  const setHost = React.useCallback(
    (element: HTMLElement | null) => {
      host.current = element
      if (typeof ref === 'function') ref(element)
      else if (ref) ref.current = element
    },
    [ref]
  )

  // Bubbles register from their own layout effects, which run before ours: queue until ready.
  const registry = React.useMemo<GlassRegistry>(
    () => ({
      register(id, element, options) {
        if (scene.current) return scene.current.register(id, element, options)
        let unregister: (() => void) | null = null
        let cancelled = false
        pending.current.push(() => {
          if (!cancelled) unregister = scene.current!.register(id, element, options)
        })
        return () => {
          cancelled = true
          unregister?.()
        }
      },
      requestMeasure() {
        scene.current?.requestMeasure()
      },
    }),
    []
  )

  useIsomorphicLayoutEffect(() => {
    if (!host.current || !backdrop.current || !paint.current || !shadow.current) return
    const created = new GlassScene(host.current, backdrop.current, paint.current, shadow.current, uid)
    scene.current = created
    const own = solo ? created.register(soloId, host.current, { union: solo.union, motion: solo.motion, origin: solo.origin }) : null
    for (const register of pending.current.splice(0)) register()
    created.measure()
    // Paint before the browser does, so the bubbles never show a frame of their own fallback.
    created.draw()
    return () => {
      own?.()
      created.dispose()
      scene.current = null
      host.current?.removeAttribute('data-glass-ready')
    }
  }, [uid])

  useIsomorphicLayoutEffect(() => {
    const current = scene.current
    if (!current) return
    current.cornerShape = cornerShape
    current.spacing = lightTier ? 0 : Math.max(0, spacing)
    current.reduceMotion = reduced
    current.followPointer = light === 'pointer' && liquid
    current.interactive = interactive && liquid
    current.adaptive = adaptive
    current.material = material
    current.tint = tint === undefined ? options.tint : clampGlassTint(tint)
    current.blur = options.blur || bar !== null
    current.highlightWidth = Number.isFinite(highlightWidth) ? Math.min(100, Math.max(0, highlightWidth)) : 1
    current.highlightProfile = highlightProfile
    current.highlightStrength = Number.isFinite(highlightStrength) ? Math.min(10, Math.max(0, highlightStrength)) : 1
    current.refractionProfile = refractionProfile
    current.refractionStrength = Number.isFinite(refractionStrength) ? Math.min(10, Math.max(0, refractionStrength)) : 1
    current.backdropSource = backdropSource
    // The bend is part of the liquid effect: transparent glass stays unbent.
    current.refraction = options.refraction && liquid
    current.requestMeasure()
  })

  React.useEffect(() => {
    const source = backdropSource ? document.getElementById(backdropSource) : null
    if (!source || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => scene.current?.requestMeasure())
    observer.observe(source)
    return () => observer.disconnect()
  }, [backdropSource])

  React.useEffect(() => {
    if (light !== 'pointer' || reduced || !liquid) return
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    if (!fine?.matches) return
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      // The scene already coalesces pointer updates on the shared paint clock. A second
      // animation-frame gate here delayed its light by one refresh during a drag.
      scene.current?.setPointer({ x: event.clientX, y: event.clientY })
    }
    const leave = () => scene.current?.setPointer(null)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [light, reduced, liquid])

  return React.createElement(
    as,
    { ...props, 'ref': setHost, 'className': cn('lab-glass-container', className), 'data-glass-container': '', 'data-glass-member': solo ? '' : undefined, 'data-glass-corners': cornerShape, 'data-glass-material': material, 'data-glass-local-tint': '', style: { ...props.style, ...(tint === undefined ? {} : { '--lab-glass-tint': clampGlassTint(tint) }) } as React.CSSProperties },
    <div className="lab-glass-material" aria-hidden="true">
      <svg ref={shadow} className="lab-glass-shadow" />
      <div ref={backdrop} className="lab-glass-backdrops" />
      <svg ref={paint} className="lab-glass-paint" />
    </div>,
    <GlassContext.Provider value={registry}>{children}</GlassContext.Provider>
  )
})

/**
 * A GlassContainer unless one already encloses it, then a plain element. Kit rows (app bar,
 * toolbar, dock, search) use it so they share one material without ever nesting containers.
 */
export const GlassScope = React.forwardRef<HTMLElement, GlassContainerProps>(function GlassScope(
  { as = 'div', spacing, cornerShape, light, interactive, adaptive, tint, highlightWidth, highlightProfile, highlightStrength, refractionStrength, refractionProfile, backdropSource, material, ...props },
  ref
) {
  const outer = React.useContext(GlassContext)
  if (outer) return React.createElement(as, { ...props, ref })
  return <GlassContainer {...props} as={as} spacing={spacing} cornerShape={cornerShape} light={light} interactive={interactive} adaptive={adaptive} tint={tint} highlightWidth={highlightWidth} highlightProfile={highlightProfile} highlightStrength={highlightStrength} refractionStrength={refractionStrength} refractionProfile={refractionProfile} backdropSource={backdropSource} material={material} ref={ref} />
})

/**
 * Glass bars floating over scrolling content (a ScrollArea's app bar and dock, a TabView's tab
 * bar): their labels sit on moving content, so every glass inside is at least `GLASS_BAR_TINT`
 * tinted and blurred with the measured blur, whatever the theme's `glassTint` and `glassBlur`
 * (glass elsewhere keeps them), as iOS bars are. Wraps its children in a layout-neutral element.
 */
export function GlassBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { tint } = useGlassOptions()
  const raised = Math.max(tint, GLASS_BAR_TINT)
  const bar = React.useMemo(() => ({ tint: raised }), [raised])
  return (
    <GlassBarContext.Provider value={bar}>
      <div className={cn('lab-glass-bar', className)} style={{ '--lab-glass-tint': raised } as React.CSSProperties}>
        {children}
      </div>
    </GlassBarContext.Provider>
  )
}

