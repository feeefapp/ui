import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './frame.css'

/** Width of an element, kept up to date with a ResizeObserver. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * A bounded pretend screen for layout demos. It lays its children out at `width` × `height` CSS
 * pixels (so the scaffold measures a real desktop or phone width) and scales the whole screen down
 * to fit the docs column. Nothing inside can resize the page.
 */
export function DemoScreen({
  width,
  height,
  label,
  children,
}: {
  width: number
  height: number
  label: string
  children: ReactNode
}) {
  const [ref, available] = useWidth<HTMLDivElement>()
  const scale = available ? Math.min(1, available / width) : 1
  return (
    <div ref={ref} className="gl-screen" style={{ height: Math.round(height * scale) }} role="group" aria-label={label}>
      <div
        className="gl-screen-device"
        // A screen narrower than the column sits in the middle of it.
        style={{ width, height, transform: `scale(${scale})`, insetInlineStart: Math.max(0, (available - width) / 2) }}
      >
        {children}
      </div>
    </div>
  )
}

/** A numbered callout matching the legend under a demo. */
export function Marker({ n }: { n: number }) {
  return (
    <span className="gl-marker" aria-hidden="true">
      {n}
    </span>
  )
}
