'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { SPRINGS, springTiming } from '../physics/spring'
import { prefersReducedMotion } from '../physics/motion-value'

/** What changed in the visible row between two layouts. Pure. */
export function diffVisibleActions(previous: readonly string[], next: readonly string[]) {
  const before = new Set(previous)
  const after = new Set(next)
  return {
    /** Came out of the More menu (or are new): they grow out of the More button. */
    entering: next.filter((id) => !before.has(id)),
    /** Went into the More menu (or were removed): they shrink into the More button. */
    leaving: previous.filter((id) => !after.has(id)),
    /** Stayed visible: they slide to their new place. */
    staying: next.filter((id) => before.has(id)),
  }
}

type Box = { left: number; top: number; width: number; height: number }
const boxOf = (element: Element): Box => {
  const r = element.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}
const centre = (box: Box) => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 })

/**
 * Moves actions in and out of the overflow menu instead of letting them pop: entries that spill
 * shrink into the More button, entries that come back grow out of it, and the rest slide. The
 * departing node is the real (unmounted) element, shown inert for the length of the animation.
 */
export function useOverflowMotion(row: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>, visible: readonly string[]) {
  const last = useRef<{ ids: string[]; entries: Map<string, { element: HTMLElement; box: Box }>; trigger: Box | null } | null>(null)
  // Runs after every render: positions can change without the visible set changing (a resize),
  // and the next change must slide from where entries really were.
  useLayoutEffect(() => {
    const host = row.current
    if (!host) return
    const entries = new Map<string, { element: HTMLElement; box: Box }>()
    for (const element of host.querySelectorAll<HTMLElement>(':scope > [data-lab-action-id]'))
      entries.set(element.dataset.labActionId!, { element, box: boxOf(element) })
    const triggerBox = trigger.current ? boxOf(trigger.current) : null
    const previous = last.current
    last.current = { ids: [...visible], entries, trigger: triggerBox ?? previous?.trigger ?? null }
    if (!previous || prefersReducedMotion() || typeof Element.prototype.animate !== 'function') return
    const diff = diffVisibleActions(previous.ids, visible)
    if (!diff.entering.length && !diff.leaving.length && previous.ids.join() === visible.join()) return
    const timing = springTiming(SPRINGS.snappy)
    const fade = { duration: Math.round(timing.duration * 0.6), easing: 'ease-out', fill: 'backwards' as const }
    const button = triggerBox ?? previous.trigger
    const hostBox = boxOf(host)
    for (const id of diff.staying) {
      const now = entries.get(id)
      const before = previous.entries.get(id)
      if (!now || !before) continue
      const dx = before.box.left - now.box.left
      const dy = before.box.top - now.box.top
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
        now.element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], timing)
    }
    for (const id of diff.entering) {
      const now = entries.get(id)
      if (!now) continue
      const from = button ? centre(button) : centre(now.box)
      const to = centre(now.box)
      now.element.animate(
        [{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(0.4)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { ...timing, fill: 'backwards' }
      )
      now.element.animate([{ opacity: 0 }, { opacity: 1 }], fade)
    }
    for (const id of diff.leaving) {
      const before = previous.entries.get(id)
      if (!before || before.element.isConnected) continue
      const ghost = before.element
      ghost.setAttribute('aria-hidden', 'true')
      ghost.inert = true
      ghost.classList.add('lab-actions-bar__ghost')
      Object.assign(ghost.style, {
        left: `${before.box.left - hostBox.left}px`,
        top: `${before.box.top - hostBox.top}px`,
        width: `${before.box.width}px`,
        height: `${before.box.height}px`,
      })
      host.append(ghost)
      const from = centre(before.box)
      const to = button ? centre(button) : from
      const animation = ghost.animate(
        [{ transform: 'none', opacity: 1 }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.4)`, opacity: 0 }],
        { ...timing, fill: 'forwards' }
      )
      animation.onfinish = animation.oncancel = () => ghost.remove()
      // Animations pause in hidden tabs; never leave a ghost behind.
      setTimeout(() => ghost.remove(), timing.duration + 200)
    }
  })
}
