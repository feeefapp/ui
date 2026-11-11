'use client'

import * as React from 'react'
import { attachPan, type PanPoint } from '../physics/gesture'
import { dividerKeyValue } from './resize-model'

type ResizeDividerProps = {
  value: number
  min: number
  max: number
  reset: number
  label: string
  className: string
  style?: React.CSSProperties
  enabled?: boolean
  onChange: (value: number) => void
  onDragStart?: () => number
  onDragMove?: (value: number, point: PanPoint) => void
  onDragEnd?: (point: PanPoint & { cancelled: boolean }) => void
}

/** Internal shared separator: one pan recognizer and physical-arrow/RTL contract for columns. */
export function ResizeDivider(props: ResizeDividerProps) {
  const element = React.useRef<HTMLDivElement>(null)
  const live = React.useRef(props)
  live.current = props
  const enabled = props.enabled !== false
  React.useEffect(() => {
    const el = element.current
    if (!el || !enabled) return
    let start = 0, rtl = false
    return attachPan(el, () => ({
      axis: 'x', threshold: 1,
      onStart: () => {
        const p = live.current
        start = p.onDragStart?.() ?? p.value
        rtl = getComputedStyle(el).direction === 'rtl'
        el.setAttribute('data-resizing', '')
      },
      onMove: point => {
        const p = live.current
        const next = start + (rtl ? -point.dx : point.dx)
        if (p.onDragMove) p.onDragMove(next, point)
        else p.onChange(Math.max(p.min, Math.min(p.max, next)))
      },
      onEnd: point => {
        el.removeAttribute('data-resizing')
        live.current.onDragEnd?.(point)
      },
    }))
  }, [enabled])
  return <div ref={element} className={props.className} style={props.style} role="separator"
    aria-orientation="vertical" aria-label={props.label}
    aria-valuenow={props.value} aria-valuemin={props.min} aria-valuemax={props.max}
    aria-disabled={!enabled || undefined} tabIndex={enabled ? 0 : undefined}
    data-resizable={enabled || undefined} data-resize-value={props.value}
    onDoubleClick={() => enabled && props.onChange(Math.max(props.min, Math.min(props.max, props.reset)))}
    onKeyDown={event => {
      if (!enabled) return
      const next = dividerKeyValue(event.key, props.value, props.min, props.max, getComputedStyle(event.currentTarget).direction === 'rtl')
      if (next === null) return
      event.preventDefault()
      props.onChange(next)
    }} />
}
