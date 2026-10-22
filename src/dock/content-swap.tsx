'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../utils'

/**
 * Cross-fades interactive dock content when `swapKey` changes: the old content fades out and turns
 * inert (focus moves to the dock first), then the new content fades in. Same-key changes keep focus
 * and child state.
 */
export function LabDockContentSwap({
  swapKey,
  children,
}: {
  /** Coarse task identity, e.g. `idle` / `selected`. */
  swapKey: string
  /** The current content. */
  children: ReactNode
}) {
  const latest = useRef({ key: swapKey, node: children })
  latest.current = { key: swapKey, node: children }
  const [shown, setShown] = useState(latest.current)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const snapshot = useRef(shown)
  const root = useRef<HTMLDivElement>(null)
  const shownKey = useRef(swapKey)
  if (shown.key === swapKey && phase !== 'out') snapshot.current = latest.current
  useLayoutEffect(() => {
    if (shownKey.current === swapKey) {
      setPhase('idle')
      setShown(latest.current)
      return
    }
    let enter = 0,
      settle = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // A focused outgoing action must not leave focus on an inert or detached node.
    const active = document.activeElement
    const owner =
      active instanceof Element
        ? active.closest('[data-lab-actions-owner]')?.getAttribute('data-lab-actions-owner')
        : null
    const ownsMenuFocus =
      owner &&
      [...(root.current?.querySelectorAll('[data-lab-actions-owner]') ?? [])].some(
        (element) => element.getAttribute('data-lab-actions-owner') === owner
      )
    if (root.current?.contains(active) || ownsMenuFocus)
      root.current?.closest<HTMLElement>('[data-lab-dock]')?.focus({ preventScroll: true })
    if (reduced) {
      shownKey.current = swapKey
      setShown(latest.current)
      setPhase('idle')
      return
    }
    setShown(snapshot.current)
    setPhase('out')
    enter = window.setTimeout(() => {
      shownKey.current = latest.current.key
      setShown(latest.current)
      setPhase('in')
      settle = window.setTimeout(() => setPhase('idle'), 160)
    }, 100)
    return () => {
      clearTimeout(enter)
      clearTimeout(settle)
    }
  }, [swapKey])
  const content = shown.key === swapKey && phase !== 'out' ? children : shown.node
  return (
    <div
      ref={root}
      className={cn('lab-dock-swap', `lab-dock-swap--${phase}`)}
      inert={phase === 'out' || undefined}
    >
      <div key={shown.key}>{content}</div>
    </div>
  )
}
