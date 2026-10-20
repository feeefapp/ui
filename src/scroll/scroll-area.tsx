'use client'

import {
  forwardRef,
  useRef,
  useLayoutEffect,
  useState,
  useImperativeHandle,
  type ReactNode,
  type HTMLAttributes,
  type CSSProperties,
} from 'react'
import { cn } from '../utils'
import { LabScrollGradientOverlay } from './gradient-overlay'
import { scrollContentReserve } from './metrics'
import './scroll.css'

export type LabScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode
  top?: ReactNode
  bottom?: ReactNode
  label: string
  edgeGap?: number
  contentPadding?: number
  gradient?: boolean
  topFadeHeight?: number
  bottomFadeHeight?: number
  /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
  viewportProps?: HTMLAttributes<HTMLDivElement>
}

/** Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes. */
export const LabScrollArea = forwardRef<HTMLDivElement, LabScrollAreaProps>(function LabScrollArea(
  {
    children,
    top,
    bottom,
    label,
    edgeGap = 12,
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
  return (
    <div
      {...props}
      className={cn('lab-scroll-area', className)}
      style={
        {
          ...style,
          '--lab-scroll-gap': `${Math.max(0, edgeGap)}px`,
          '--lab-scroll-padding': `${Math.max(0, contentPadding)}px`,
          '--lab-scroll-top-reserve': `${scrollContentReserve(heights.top, edgeGap, contentPadding)}px`,
          '--lab-scroll-bottom-reserve': `${scrollContentReserve(heights.bottom, edgeGap, contentPadding)}px`,
        } as CSSProperties
      }
    >
      {top && (
        <div ref={topRef} className="lab-scroll-float lab-scroll-float--top">
          {top}
        </div>
      )}
      <div
        {...viewportProps}
        ref={viewport}
        className={cn('lab-scroll-viewport', viewportProps?.className)}
        role={viewportProps?.role ?? 'region'}
        aria-label={viewportProps?.['aria-label'] ?? label}
        tabIndex={viewportProps?.tabIndex ?? 0}
      >
        <div className="lab-scroll-content">{children}</div>
      </div>
      {gradient && (
        <LabScrollGradientOverlay
          viewport={viewport}
          topHeight={topFadeHeight ?? Math.max(100, heights.top + edgeGap * 2)}
          bottomHeight={bottomFadeHeight ?? Math.max(140, heights.bottom + edgeGap * 2)}
        />
      )}
      {bottom && (
        <div ref={bottomRef} className="lab-scroll-float lab-scroll-float--bottom">
          {bottom}
        </div>
      )}
    </div>
  )
})
