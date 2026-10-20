'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

interface Measurements {
  availableWidth: number
  widths: ReadonlyMap<string, number>
  overflowWidth: number
}

/** Measure the same controls the user sees, including fonts, zoom and loading. */
export function useMeasuredActions(
  host: RefObject<HTMLDivElement | null>,
  measuringRow: RefObject<HTMLDivElement | null>,
  revision: unknown
) {
  const [measurements, setMeasurements] = useState<Measurements | null>(null)
  const focusAfterFit = useRef<string | null>(null)

  useLayoutEffect(() => {
    const element = host.current
    const row = measuringRow.current
    if (!element || !row) return
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const active = element.ownerDocument.activeElement
      if (active instanceof HTMLElement && element.contains(active) && !row.contains(active)) {
        focusAfterFit.current =
          active.closest<HTMLElement>('[data-lab-action-id]')?.dataset.labActionId ?? null
      }
      const style = getComputedStyle(element)
      const availableWidth = Math.max(
        0,
        element.clientWidth -
          Number.parseFloat(style.paddingLeft || '0') -
          Number.parseFloat(style.paddingRight || '0')
      )
      const widths = new Map<string, number>()
      for (const item of row.querySelectorAll<HTMLElement>('[data-lab-action-id]')) {
        widths.set(item.dataset.labActionId!, item.getBoundingClientRect().width)
      }
      const overflowWidth =
        row.querySelector<HTMLElement>('[data-lab-overflow-measure]')?.getBoundingClientRect()
          .width ?? 40
      setMeasurements((previous) => {
        if (
          previous &&
          previous.availableWidth === availableWidth &&
          previous.overflowWidth === overflowWidth &&
          previous.widths.size === widths.size &&
          [...widths].every(([id, width]) => previous.widths.get(id) === width)
        )
          return previous
        return { availableWidth, widths, overflowWidth }
      })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    for (const child of row.children) observer?.observe(child)
    // Font loading and browser zoom may change a label without a parent resize.
    const fonts = element.ownerDocument.fonts
    void fonts?.ready.then(measure)
    fonts?.addEventListener('loadingdone', measure)
    element.ownerDocument.defaultView?.addEventListener('resize', measure)
    return () => {
      cancelled = true
      observer?.disconnect()
      fonts?.removeEventListener('loadingdone', measure)
      element.ownerDocument.defaultView?.removeEventListener('resize', measure)
    }
  }, [host, measuringRow, revision])

  return { measurements, focusAfterFit }
}
