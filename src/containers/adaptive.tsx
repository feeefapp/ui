'use client'

import * as React from 'react'
import { animateLayoutFrom, snapshotLayout } from '../physics/layout-group'
import { LabMotionValue, prefersReducedMotion } from '../physics/motion-value'
import { cn } from '../utils'
import { pickFitting } from './adaptive-model'
import './adaptive.css'

/** `compact` below the breakpoint, `regular` from it: the element's own width, not the window's. */
export type LabSizeClass = 'compact' | 'regular'


/** Width of `ref`'s element, kept current with a ResizeObserver; null before the first layout. */
export function useLabElementWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = React.useState<number | null>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * The size class of an element, like SwiftUI's horizontal size class but measured on the element,
 * so a component in a narrow pane is compact even on a wide screen.
 */
export function useLabSizeClass(ref: React.RefObject<HTMLElement | null>, breakpoint = 600): LabSizeClass {
  const width = useLabElementWidth(ref)
  return width !== null && width < breakpoint ? 'compact' : 'regular'
}

export type LabAdaptiveStackProps = {
  /** The items. Each direct child moves as one piece when the stack changes axis. */
  children: React.ReactNode
  /**
   * When to stack vertically: below a width in px, or `fit` (default) whenever the items would
   * not fit side by side at their natural width.
   */
  breakpoint?: number | 'fit'
  /** Space between items in px. Default 12. */
  gap?: number
  /** Cross-axis alignment while horizontal. Default `center`. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Main-axis distribution while horizontal. Default `start`. */
  justify?: 'start' | 'center' | 'end' | 'between'
  /** Called when the axis changes. */
  onAxisChange?: (axis: 'horizontal' | 'vertical') => void
  className?: string
  style?: React.CSSProperties
}

/**
 * A row that becomes a column when there is no room, like SwiftUI's AnyLayout switching an HStack
 * for a VStack: the same children, re-laid out, each flying to its new place on a spring. Use it
 * for a summary card's stats, a form's actions, or a toolbar's groups.
 */
export function LabAdaptiveStack({
  children,
  breakpoint = 'fit',
  gap = 12,
  align = 'center',
  justify = 'start',
  onAxisChange,
  className,
  style,
}: LabAdaptiveStackProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const [vertical, setVertical] = React.useState(false)
  const pending = React.useRef<ReturnType<typeof snapshotLayout> | null>(null)
  const live = React.useRef({ vertical, onAxisChange })
  live.current = { vertical, onAxisChange }

  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const decide = () => {
      let next: boolean
      if (breakpoint === 'fit') {
        // Natural single-row width, measured in one synchronous pass.
        el.dataset.measuring = ''
        const natural = el.scrollWidth
        delete el.dataset.measuring
        next = natural > el.clientWidth + 0.5
      } else next = el.clientWidth < breakpoint
      if (next === live.current.vertical) return
      pending.current = snapshotLayout(Array.from(el.children) as HTMLElement[])
      setVertical(next)
      live.current.onAxisChange?.(next ? 'vertical' : 'horizontal')
    }
    decide()
    const observer = new ResizeObserver(decide)
    observer.observe(el)
    // Content changes (a longer label) can also change whether the row fits.
    const mutations = new MutationObserver(decide)
    mutations.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [breakpoint])

  React.useLayoutEffect(() => {
    if (!pending.current) return
    animateLayoutFrom(pending.current)
    pending.current = null
  }, [vertical])

  return (
    <div
      ref={root}
      className={cn('lab-adaptive-stack', className)}
      data-axis={vertical ? 'vertical' : 'horizontal'}
      data-align={align}
      data-justify={justify}
      style={{ ...style, '--lab-adaptive-gap': `${gap}px` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

export type LabViewThatFitsProps = {
  /** Options from most to least preferred, e.g. a full toolbar, then icons only, then a menu. */
  children: React.ReactNode
  /** Accessible names are each option's own; this labels nothing. */
  className?: string
}

/**
 * Shows the first child that fits the available width, like SwiftUI's ViewThatFits: “Call
 * customer · Send SMS · Copy number”, else icons only, else one menu button. Every option is
 * measured off-screen at its natural width; the shown one swaps with a short fade.
 */
export function LabViewThatFits({ children, className }: LabViewThatFitsProps) {
  const options = React.Children.toArray(children).filter(React.isValidElement)
  const root = React.useRef<HTMLDivElement>(null)
  const measure = React.useRef<HTMLDivElement>(null)
  const shown = React.useRef<HTMLDivElement>(null)
  const [index, setIndex] = React.useState(0)

  React.useLayoutEffect(() => {
    const el = root.current,
      probe = measure.current
    if (!el || !probe) return
    const decide = () => {
      const widths = Array.from(probe.children).map((child) => (child as HTMLElement).offsetWidth)
      setIndex(pickFitting(widths, el.clientWidth))
    }
    decide()
    const observer = new ResizeObserver(decide)
    observer.observe(el)
    observer.observe(probe)
    return () => observer.disconnect()
  }, [options.length])

  const fade = React.useRef(new LabMotionValue(1, 0.01)).current
  const first = React.useRef(true)
  React.useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = shown.current
    if (!el || prefersReducedMotion()) return
    const unsubscribe = fade.subscribe((v) => (el.style.opacity = String(v)))
    fade.set(0)
    void fade.animateTo(1, { spring: { duration: 0.2, bounce: 0 } }).then(() => {
      unsubscribe()
      el.style.opacity = ''
    })
    return unsubscribe
  }, [index])

  return (
    <div ref={root} className={cn('lab-view-that-fits', className)}>
      <div ref={shown} className="lab-view-that-fits-shown">
        {options[index]}
      </div>
      <div ref={measure} className="lab-view-that-fits-probe" aria-hidden="true" inert>
        {options.map((option, i) => (
          <div key={i}>{option}</div>
        ))}
      </div>
    </div>
  )
}
