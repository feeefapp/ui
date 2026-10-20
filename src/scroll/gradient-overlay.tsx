'use client'

import {
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type RefObject,
  type CSSProperties,
} from 'react'
import { scrollEdgeOpacities, scrollWashPaths } from './metrics'
import './scroll.css'

export type LabScrollGradientOverlayProps = {
  viewport: RefObject<HTMLElement | null>
  topHeight?: number
  bottomHeight?: number
  density?: number
  fadeZone?: number
  /** Defaults to the nearest content surface, not to the floating control material. */
  color?: string
}

/** Read scroll metrics once per frame; update opacity without rerendering the scroll content. */
export function LabScrollGradientOverlay({
  viewport,
  topHeight = 100,
  bottomHeight = 160,
  density = 0.8,
  fadeZone = 80,
  color,
}: LabScrollGradientOverlayProps) {
  const root = useRef<HTMLDivElement>(null)
  const topPaint = useRef<SVGSVGElement>(null)
  const bottomPaint = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 320, height: 400 })
  useLayoutEffect(() => {
    const view = viewport.current,
      overlay = root.current
    if (!view || !overlay) return
    let frame = 0
    const read = () => {
      frame = 0
      const opacity = scrollEdgeOpacities(
        view.scrollTop,
        view.scrollHeight - view.clientHeight,
        fadeZone
      )
      // SVG opacity attributes bypass the HTML corner observer; scrolling never rescans corners.
      for (const [paint, value] of [
        [topPaint.current, opacity.top],
        [bottomPaint.current, opacity.bottom],
      ] as const) {
        if (paint && paint.getAttribute('opacity') !== String(value))
          paint.setAttribute('opacity', String(value))
      }
      setSize((previous) =>
        previous.width === view.clientWidth && previous.height === view.clientHeight
          ? previous
          : { width: view.clientWidth, height: view.clientHeight }
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(view)
    const watchContent = () => {
      resize.disconnect()
      resize.observe(view)
      if (view.firstElementChild) resize.observe(view.firstElementChild)
      schedule()
    }
    const mutation = new MutationObserver(watchContent)
    // Only the content root swapping matters; its size changes reach the ResizeObserver.
    mutation.observe(view, { childList: true })
    watchContent()
    cancelAnimationFrame(frame)
    read()
    view.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
      view.removeEventListener('scroll', schedule)
    }
  }, [viewport, fadeZone])
  const top = Math.max(0, Math.min(topHeight, size.height * 0.4))
  const bottom = Math.max(0, Math.min(bottomHeight, size.height * 0.4))
  return (
    <div
      ref={root}
      className="lab-scroll-gradient"
      aria-hidden="true"
      style={
        {
          '--lab-scroll-wash-color': color,
          '--lab-scroll-wash-density': Math.max(0, Math.min(1, density)),
        } as CSSProperties
      }
    >
      <Wash edge="top" width={size.width} height={top} paintRef={topPaint} />
      <Wash edge="bottom" width={size.width} height={bottom} paintRef={bottomPaint} />
    </div>
  )
}
function Wash({
  edge,
  width,
  height,
  paintRef,
}: {
  edge: 'top' | 'bottom'
  width: number
  height: number
  paintRef: RefObject<SVGSVGElement | null>
}) {
  const columns = Math.max(1, Math.ceil(width / 8)),
    rows = Math.max(1, Math.ceil(height / 8))
  const paths = useMemo(() => scrollWashPaths(columns, rows), [columns, rows])
  return (
    <div className={`lab-scroll-wash lab-scroll-wash--${edge}`} style={{ height }}>
      <svg
        ref={paintRef}
        opacity={edge === 'top' ? 0.28 : 0.48}
        viewBox={`0 0 ${columns} ${rows}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        {paths.map((d, level) => d && <path key={level} d={d} opacity={level / 11} />)}
      </svg>
    </div>
  )
}
