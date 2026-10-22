'use client'

import * as React from 'react'
import { cn } from '../utils'
import { useReducedMotion } from '../physics/react'
import { GlassContext, type GlassRegistry } from './context'
import { GlassScene } from './scene'
import type { GlassRenderer, GlassStyle } from '../theme-config'
import './glass.css'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/** A theme attribute on `<html>`, live, limited to `allowed` values. */
function useRootChoice<T extends string>(attribute: string, allowed: readonly T[], fallback: T): T {
  return React.useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: [attribute] })
      return () => observer.disconnect()
    },
    () => {
      const value = document.documentElement.getAttribute(attribute) as T | null
      return value && allowed.includes(value) ? value : fallback
    },
    () => fallback
  )
}

/** The app's glass style (ThemeConfig `glass`, on `<html data-lab-glass>`), live. */
export function useGlassStyle(): GlassStyle {
  return useRootChoice<GlassStyle>('data-lab-glass', ['liquid', 'frosted', 'solid'], 'liquid')
}

/** The app's glass renderer (ThemeConfig `glassRenderer`, on `<html data-lab-glass-renderer>`), live. */
export function useGlassRenderer(): GlassRenderer {
  return useRootChoice<GlassRenderer>('data-lab-glass-renderer', ['fill', 'css', 'canvas'], 'fill')
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
}

/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. The app's ThemeConfig `glass` sets the style: `liquid` (moving
 * light, press response), `frosted` (still light, no press) or `solid` (opaque). Bubbles that come within `spacing` bend toward each other and
 * merge; a bubble that splits into several grows them out of itself; new and removed bubbles
 * materialize. Bubbles keep their layout, focus and semantics; only the paint moves here. Without
 * JavaScript, or in forced colors, every bubble paints its own glass as before.
 */
export const GlassContainer = React.forwardRef<HTMLElement, GlassContainerProps>(function GlassContainer(
  { as = 'div', spacing = 8, light = 'pointer', interactive = true, adaptive = true, className, children, ...props },
  ref
) {
  const host = React.useRef<HTMLElement | null>(null)
  const backdrop = React.useRef<HTMLDivElement>(null)
  const paint = React.useRef<SVGSVGElement>(null)
  const shadow = React.useRef<SVGSVGElement>(null)
  const scene = React.useRef<GlassScene | null>(null)
  const pending = React.useRef<(() => void)[]>([])
  const uid = React.useId()
  const reduced = useReducedMotion()
  const style = useGlassStyle()
  const renderer = useGlassRenderer()
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
    for (const register of pending.current.splice(0)) register()
    created.measure()
    return () => {
      created.dispose()
      scene.current = null
      host.current?.removeAttribute('data-glass-ready')
    }
  }, [uid])

  useIsomorphicLayoutEffect(() => {
    const current = scene.current
    if (!current) return
    current.spacing = Math.max(0, spacing)
    current.reduceMotion = reduced
    current.followPointer = light === 'pointer' && liquid
    current.interactive = interactive && liquid
    current.adaptive = adaptive
    current.renderer = renderer
    current.requestMeasure()
  })

  React.useEffect(() => {
    if (light !== 'pointer' || reduced || !liquid) return
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    if (!fine?.matches) return
    let frame = 0
    let last: { x: number; y: number } | null = null
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      last = { x: event.clientX, y: event.clientY }
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          scene.current?.setPointer(last)
        })
    }
    const leave = () => scene.current?.setPointer(null)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [light, reduced, liquid])

  return React.createElement(
    as,
    { ...props, 'ref': setHost, 'className': cn('lab-glass-container', className), 'data-glass-container': '' },
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
  { as = 'div', spacing, light, interactive, adaptive, ...props },
  ref
) {
  const outer = React.useContext(GlassContext)
  if (outer) return React.createElement(as, { ...props, ref })
  return <GlassContainer {...props} as={as} spacing={spacing} light={light} interactive={interactive} adaptive={adaptive} ref={ref} />
})
