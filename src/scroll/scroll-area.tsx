'use client'

import {
  forwardRef,
  useRef,
  useId,
  useLayoutEffect,
  useState,
  useImperativeHandle,
  type ReactNode,
  type HTMLAttributes,
  type CSSProperties,
} from 'react'
import { GlassBackdropContext } from '../glass/context'
import { cn } from '../utils'
import { ScrollGradientOverlay } from './gradient-overlay'
import { scrollContentReserve } from './metrics'
import './scroll.css'

export type ScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The scrolling content. */
  children: ReactNode
  /** Chrome floating over the top edge (toolbar, filter bar). Its height is reserved as top padding. */
  top?: ReactNode
  /** Chrome floating over the bottom edge (usually a Dock). Its height is reserved as bottom padding. */
  bottom?: ReactNode
  /** Accessible name of the scroll region. */
  label: string
  /** Space in px between a float and the area's edges; also added above and below it in the reservation. */
  edgeGap?: number
  /** Space in px between a float and the area's sides, when it differs from `edgeGap` (a scaffold's app bar uses `--lab-toolbar-inset`). */
  sideGap?: number
  /** Content padding in px: inline sides, and top/bottom when no float is present. */
  contentPadding?: number
  /** Paints the dithered edge washes that fade content under the floats. */
  gradient?: boolean
  /** Top wash height in px. Defaults to the top float's height plus two edge gaps, at least 100. */
  topFadeHeight?: number
  /** Bottom wash height in px. Defaults to the bottom float's height plus two edge gaps, at least 140. */
  bottomFadeHeight?: number
  /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
  viewportProps?: HTMLAttributes<HTMLDivElement>
}

/**
 * Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes. Fills its
 * parent, which must have a bounded height. The forwarded ref points at the scrolling element.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    children,
    top,
    bottom,
    label,
    edgeGap = 12,
    sideGap,
    contentPadding = 24,
    gradient = true,
    topFadeHeight,
    bottomFadeHeight,
    viewportProps,
    className,
    style,
    ...props
  },
  ref
) {
  const viewport = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null),
    bottomRef = useRef<HTMLDivElement>(null)
  const [heights, setHeights] = useState({ top: 0, bottom: 0 })
  useImperativeHandle(ref, () => viewport.current!, [])
  useLayoutEffect(() => {
    const measure = () => {
      const next = {
        top: topRef.current?.offsetHeight ?? 0,
        bottom: bottomRef.current?.offsetHeight ?? 0,
      }
      setHeights((previous) =>
        previous.top === next.top && previous.bottom === next.bottom ? previous : next
      )
    }
    const resize = new ResizeObserver(measure)
    if (topRef.current) resize.observe(topRef.current)
    if (bottomRef.current) resize.observe(bottomRef.current)
    measure()
    return () => resize.disconnect()
  }, [Boolean(top), Boolean(bottom)])
  const sourceId = `scroll-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const backdropId = viewportProps?.id ?? sourceId

  return (
    <div
      {...props}
      className={cn('lab-scroll-area', className)}
      style={
        {
          ...style,
          '--lab-scroll-gap': `${Math.max(0, edgeGap)}px`,
          ...(sideGap === undefined ? {} : { '--lab-scroll-side-gap': `${Math.max(0, sideGap)}px` }),
          '--lab-scroll-padding': `${Math.max(0, contentPadding)}px`,
          '--lab-scroll-top-reserve': `${scrollContentReserve(heights.top, edgeGap, contentPadding)}px`,
          '--lab-scroll-bottom-reserve': `${scrollContentReserve(heights.bottom, edgeGap, contentPadding)}px`,
        } as CSSProperties
      }
    >
      {top && (
        <div ref={topRef} className="lab-scroll-float lab-scroll-float--top">
          <GlassBackdropContext.Provider value={backdropId}>{top}</GlassBackdropContext.Provider>
        </div>
      )}
      <div
        {...viewportProps}
        id={backdropId}
        ref={viewport}
        className={cn('lab-scroll-viewport', viewportProps?.className)}
        role={viewportProps?.role ?? 'region'}
        aria-label={viewportProps?.['aria-label'] ?? label}
        tabIndex={viewportProps?.tabIndex ?? 0}
      >
        <div className="lab-scroll-content">{children}</div>
      </div>
      {gradient && (
        <ScrollGradientOverlay
          viewport={viewport}
          topHeight={topFadeHeight ?? Math.max(100, heights.top + edgeGap * 2)}
          bottomHeight={bottomFadeHeight ?? Math.max(140, heights.bottom + edgeGap * 2)}
        />
      )}
      {bottom && (
        <div ref={bottomRef} className="lab-scroll-float lab-scroll-float--bottom">
          <GlassBackdropContext.Provider value={backdropId}>{bottom}</GlassBackdropContext.Provider>
        </div>
      )}
    </div>
  )
})
