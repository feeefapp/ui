'use client'

import * as React from 'react'
import './motion.css'
import { prefersReducedMotion } from './physics/motion-value'

export type PresenceState = 'open' | 'closed'

/**
 * Keeps an element mounted while it animates out. `state` drives `data-state`
 * so CSS owns the motion; the timer is the source of truth for unmounting.
 */
export function usePresence(open: boolean, exitMs = 200) {
  const [mounted, setMounted] = React.useState(open)
  const [state, setState] = React.useState<PresenceState>(open ? 'open' : 'closed')
  React.useEffect(() => {
    if (open) {
      setMounted(true)
      setState('open')
      return
    }
    if (!mounted) return
    setState('closed')
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs)
    return () => clearTimeout(timer)
  }, [open])
  return { mounted, state }
}

/** Renders the last children while closing so exit frames never flash new content. */
export function useLatched<T>(value: T, hold: boolean) {
  const latched = React.useRef(value)
  if (hold) latched.current = value
  return latched.current
}

/**
 * Label that swaps between known values without changing width: every option
 * is laid out in the same grid cell and only the active one is visible.
 */
export function StableText({
  value,
  options,
  className,
}: {
  /** The label to show now. */
  value: string
  /** Every label this slot can show; the widest one sets the width. */
  options: string[]
  className?: string
}) {
  const all = options.includes(value) ? options : [...options, value]
  return (
    <span className={`lab-stable-text ${className || ''}`}>
      {all.map((option) => (
        <span key={option} data-active={option === value || undefined} aria-hidden={option !== value}>
          {option}
        </span>
      ))}
    </span>
  )
}

/**
 * Animates its own height to follow its content, so content that appears,
 * disappears or grows (results, errors, previews) eases instead of jumping.
 */
export function AutoHeight({
  children,
  className,
  as: Component = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  /** Element to render as the outer box. */
  as?: 'div' | 'section'
}) {
  const inner = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | null>(null)
  React.useLayoutEffect(() => {
    const element = inner.current
    if (!element || typeof ResizeObserver === 'undefined') return
    // The height goes on the outer box: under `box-sizing: border-box` it has to include that
    // box's own border and padding, or a bordered AutoHeight ends short of its content.
    const measure = () => {
      const outer = element.parentElement
      let frame = 0
      if (outer) {
        const css = getComputedStyle(outer)
        if (css.boxSizing === 'border-box') {
          frame =
            parseFloat(css.borderTopWidth) +
            parseFloat(css.borderBottomWidth) +
            parseFloat(css.paddingTop) +
            parseFloat(css.paddingBottom)
        }
      }
      setHeight(element.offsetHeight + (frame || 0))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [])
  return (
    <Component
      {...props}
      className={`lab-auto-height ${className || ''}`}
      style={{ ...props.style, height: height === null ? undefined : height }}
    >
      <div ref={inner} className="lab-auto-height-inner">
        {children}
      </div>
    </Component>
  )
}

/** Mounts `render` while open and through its exit, with the last open output frozen. */
export function Presence({
  open,
  exitMs = 160,
  render,
}: {
  /** Whether the content should be shown. */
  open: boolean
  /** How long the closing frame stays mounted, in milliseconds. 0 under reduced motion. */
  exitMs?: number
  /** Draws the content. Put the state on `data-state` so CSS can animate open and closed. While
   * closing, the frozen element also gets `data-glass-hidden`: glass bubbles in it leave the glass
   * (absorbed into their nearest neighbour) while their content fades. */
  render: (state: PresenceState) => React.ReactNode
}) {
  const { mounted, state } = usePresence(open, exitMs)
  const live = open ? render('open') : null
  const node = useLatched(live, open)
  if (!open && !mounted) return null
  return <>{open ? live : React.isValidElement(node) ? withState(node, state) : node}</>
}
function withState(node: React.ReactElement<any>, state: PresenceState) {
  return React.cloneElement(node, { 'data-state': state, 'data-glass-hidden': state === 'closed' ? '' : undefined })
}

/**
 * Cross-fades between keyed icons in one fixed-size cell, so play/pause,
 * mic/stop and similar swaps animate without moving surrounding layout.
 */
export function Swap({
  swapKey,
  children,
  className,
}: {
  /** Identity of the current child; changing it cross-fades the old child out and the new one in. */
  swapKey: string
  /** The icon to show. Decorative: the cell is `aria-hidden`, so label the control around it. */
  children: React.ReactNode
  className?: string
}) {
  const previous = React.useRef({ key: swapKey, node: children })
  const [leaving, setLeaving] = React.useState<{ key: string; node: React.ReactNode }[]>([])
  const timers = React.useRef(new Set<number>())
  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])
  React.useLayoutEffect(() => {
    const last = previous.current
    previous.current = { key: swapKey, node: children }
    if (last.key === swapKey) return
    setLeaving((old) => [
      ...old.filter((item) => item.key !== swapKey && item.key !== last.key),
      last,
    ])
    const timer = window.setTimeout(
      () => {
        timers.current.delete(timer)
        setLeaving((old) => old.filter((item) => item !== last))
      },
      prefersReducedMotion() ? 0 : 220
    )
    timers.current.add(timer)
  }, [swapKey])
  // Keep the snapshot fresh for same-key updates without re-rendering.
  if (previous.current.key === swapKey) previous.current.node = children
  return (
    <span className={`lab-swap ${className || ''}`} aria-hidden="true">
      {leaving.map((item) => (
        <span key={item.key} className="lab-swap-item" data-state="out">
          {item.node}
        </span>
      ))}
      <span key={swapKey} className="lab-swap-item" data-state="in">
        {children}
      </span>
    </span>
  )
}
