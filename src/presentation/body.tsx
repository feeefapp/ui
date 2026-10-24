'use client'

import * as React from 'react'
import { cn } from '../utils'
import { ScrollArea } from '../scroll'
import './presentation.css'

export type PresentationBodyProps = {
  /** Accessible name of the scroll region. */
  label: string
  /** Chrome floating over the top, usually a `PresentationHeader`. Its height is reserved. */
  top?: React.ReactNode
  /** Chrome floating over the bottom, usually a `PresentationDock`. Its height is reserved. */
  bottom?: React.ReactNode
  /**
   * False (default): as tall as the content plus its floating chrome, up to the height the surface
   * allows, then it scrolls. True: takes all of that height (lists, full-height panes).
   */
  fill?: boolean
  /** Space in px between the floats and the edges. Default: the shell gap G. */
  edgeGap?: number
  /** Content padding in px. Default: the shell gap G; dialogs pass 16 (a card's inside). */
  contentPadding?: number
  /** Called with the natural height (content + reserved chrome) whenever it changes. */
  onNaturalHeight?: (height: number) => void
  /** Class name of the body (the flex item holding the scroll area). */
  className?: string
  /** The content. Don't nest another vertical scroll area in it. */
  children: React.ReactNode
}

/**
 * The scrolling body of a presentation surface: a `ScrollArea` whose header and dock float over
 * the content. It is a flex item of its surface: it hugs the content plus the floating chrome,
 * shrinks to the height the surface allows (and then scrolls), or fills that height with `fill`.
 * The forwarded ref is the scrolling viewport.
 */
export const PresentationBody = React.forwardRef<HTMLDivElement, PresentationBodyProps>(function PresentationBody(
  { label, top, bottom, fill = false, edgeGap, contentPadding, onNaturalHeight, className, children },
  ref
) {
  const root = React.useRef<HTMLDivElement>(null)
  const body = React.useRef<HTMLDivElement>(null)
  const [natural, setNatural] = React.useState<number>()
  const report = React.useRef(onNaturalHeight)
  report.current = onNaturalHeight

  React.useLayoutEffect(() => {
    const element = body.current
    const content = element?.parentElement
    const area = root.current?.firstElementChild
    if (!element || !content || !area) return
    const measure = () => {
      const padding = getComputedStyle(content)
      const floats = Array.from(area.querySelectorAll<HTMLElement>(':scope > .lab-scroll-float'))
      // The floats alone, with their offsets, are the least a body can be.
      const chrome = floats.reduce((sum, float) => {
        const style = getComputedStyle(float)
        const offset = float.classList.contains('lab-scroll-float--top') ? style.top : style.bottom
        return sum + float.offsetHeight + (parseFloat(offset) || 0)
      }, 0)
      const next = Math.ceil(
        Math.max(chrome, element.offsetHeight + parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom))
      )
      setNatural((previous) => (previous === next ? previous : next))
      report.current?.(next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // Border box: the floats' reservations are padding, which changes without the body resizing.
    observer.observe(content, { box: 'border-box' })
    area.querySelectorAll(':scope > .lab-scroll-float').forEach((float) => observer.observe(float))
    measure()
    return () => observer.disconnect()
  }, [top != null, bottom != null])

  return (
    <div
      ref={root}
      className={cn('lab-presentation-body', className)}
      data-fill={fill || undefined}
      style={!fill && natural !== undefined ? { blockSize: natural } : undefined}
    >
      <ScrollArea
        ref={ref}
        className="lab-presentation-scroll"
        label={label}
        top={top ?? undefined}
        bottom={bottom ?? undefined}
        edgeGap={edgeGap}
        contentPadding={contentPadding}
      >
        <div ref={body} className="lab-presentation-content">
          {children}
        </div>
      </ScrollArea>
    </div>
  )
})
