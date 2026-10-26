'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { MotionValue, prefersReducedMotion, reducedMotionQuery } from '../physics/motion-value'
import { SPRINGS } from '../physics/spring'
import {
  composerFrame,
  composerFrameSnapshot,
  composerSameLayout,
  type ComposerLayoutSnapshot,
  type ComposerSlotName,
} from './composer-model'

type Running = {
  from: ComposerLayoutSnapshot
  to: ComposerLayoutSnapshot
  progress: MotionValue
  unsubscribe: () => void
  paint: (p: number) => void
}

const slotsOf = (capsule: HTMLElement) =>
  Array.from(capsule.querySelectorAll<HTMLElement>(':scope > * > [data-composer-slot]'))

/** Clears what a frame wrote, so layout shows where everything belongs. */
function clear(capsule: HTMLElement) {
  capsule.style.height = ''
  capsule.removeAttribute('data-animating')
  for (const slot of slotsOf(capsule)) {
    slot.style.transform = ''
    slot.style.height = ''
    slot.style.opacity = ''
    slot.style.visibility = ''
  }
}

/** The laid-out capsule: offsets are layout values (offsetTop/Left), so scaled ancestors don't matter. */
function measure(capsule: HTMLElement): ComposerLayoutSnapshot {
  const slots: ComposerLayoutSnapshot['slots'] = {}
  for (const slot of slotsOf(capsule)) {
    if (slot.hidden || !slot.offsetParent) continue
    const name = slot.dataset.composerSlot as ComposerSlotName
    slots[name] = {
      x: slot.offsetLeft,
      y: slot.offsetTop,
      height: slot.offsetHeight,
      opacity: getComputedStyle(slot).visibility === 'hidden' ? 0 : 1,
    }
  }
  return { height: capsule.offsetHeight, slots }
}

/**
 * Springs the composer capsule between layouts: when its second row opens or closes, a line is
 * added, or attachments appear, its height and every slot move together on one spring
 * (`SPRINGS.snappy`), mixed in the capsule's own pixels (`composerFrame`). The field keeps its
 * node, focus and caret; only its clip height and offset animate. Slots are the capsule grid's
 * children marked `data-composer-slot`. Reduced motion jumps.
 */
export function useComposerMotion(capsule: RefObject<HTMLElement | null>) {
  const rest = useRef<ComposerLayoutSnapshot | null>(null)
  const running = useRef<Running | null>(null)
  const update = useRef(() => {})

  useLayoutEffect(() => {
    update.current = () => {
      const el = capsule.current
      if (!el) return
      const active = running.current
      const from = active ? composerFrameSnapshot(active.from, active.to, active.progress.get()) : rest.current
      clear(el)
      const to = measure(el)
      if (active && composerSameLayout(active.to, to)) {
        // Same destination (a keystroke that changed nothing): keep the spring and its speed.
        el.setAttribute('data-animating', '')
        active.paint(active.progress.get())
        return
      }
      if (active) {
        active.unsubscribe()
        active.progress.stop()
        running.current = null
      }
      rest.current = to
      if (!from || prefersReducedMotion() || composerSameLayout(from, to)) return
      const slots = new Map(slotsOf(el).map((slot) => [slot.dataset.composerSlot as ComposerSlotName, slot]))
      const paint = (p: number) => {
        const frame = composerFrame(from, to, p)
        el.style.height = `${frame.height}px`
        for (const [name, box] of Object.entries(frame.slots)) {
          const slot = slots.get(name as ComposerSlotName)
          if (!slot) continue
          slot.style.transform = box.dx || box.dy ? `translate(${box.dx}px, ${box.dy}px)` : ''
          if (name === 'field') slot.style.height = `${box.height}px`
          slot.style.opacity = box.opacity < 1 ? String(box.opacity) : ''
          // A row that is closing stays visible while it fades.
          if (box.opacity > 0.01) slot.style.visibility = 'visible'
        }
      }
      el.setAttribute('data-animating', '')
      const progress = new MotionValue(0, 0.001)
      const unsubscribe = progress.subscribe(paint)
      paint(0)
      const run: Running = { from, to, progress, unsubscribe, paint }
      running.current = run
      void progress.animateTo(1, { spring: SPRINGS.snappy, velocity: 0 }).then((arrived) => {
        if (!arrived || running.current !== run) return
        unsubscribe()
        running.current = null
        clear(el)
        rest.current = measure(el)
      })
    }
  })

  // Every render may change the layout (text, attachments, the second row).
  useLayoutEffect(() => update.current())

  useLayoutEffect(() => {
    const el = capsule.current
    if (!el) return
    // Width changes and late font loads re-measure the resting layout without animating it.
    const remeasure = () => {
      if (!running.current && capsule.current) rest.current = measure(capsule.current)
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure)
    observer?.observe(el)
    const reduced = reducedMotionQuery()
    const jump = () => {
      const active = running.current
      if (!reduced.matches || !active) return
      active.unsubscribe()
      active.progress.stop()
      running.current = null
      clear(el)
      rest.current = measure(el)
    }
    reduced.addEventListener('change', jump)
    return () => {
      observer?.disconnect()
      reduced.removeEventListener('change', jump)
      const active = running.current
      if (active) {
        active.unsubscribe()
        active.progress.stop()
        running.current = null
      }
    }
  }, [capsule])
}
