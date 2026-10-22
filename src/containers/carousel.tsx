'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../primitives/button'
import { ToolbarGroup } from '../toolbar'
import { attachPan } from '../physics/gesture'
import { MotionValue, prefersReducedMotion } from '../physics/motion-value'
import { SPRINGS } from '../physics/spring'
import { centeredIndex, flickTarget, slideEffect, slideProgress } from './carousel-model'
import { cn } from '../utils'
import './carousel.css'

export type CarouselProps = {
  /** The slides. Each child becomes one slide. */
  children: React.ReactNode
  /** Accessible name, e.g. “Featured products”. */
  label: string
  /**
   * Slide width: a fraction of the carousel (0.8 shows a peek of the next slide, 1 is one per
   * view) or a CSS length (`'280px'`). Default 0.82.
   */
  slideWidth?: number | string
  /** Space between slides in px. Default 12. */
  gap?: number
  /** Where a resting slide aligns. Default `center`. */
  align?: 'center' | 'start'
  /** Scroll transition applied to each slide as it moves away from the center. Default `scale`. */
  effect?: 'none' | 'scale' | 'fade' | 'parallax'
  /** Controlled current slide. */
  index?: number
  /** Called when a different slide comes to rest at the center (or start). */
  onIndexChange?: (index: number) => void
  /** Page dots under the track. Default true. */
  dots?: boolean
  /** Previous/next buttons over the track: `auto` (default) shows them for mouse and trackpad users. */
  controls?: 'auto' | 'always' | 'never'
  className?: string
}

/**
 * A horizontal carousel on native scroll snapping, so touch and trackpads get the platform's own
 * momentum. Slides react to their distance from the center (scale, fade or parallax, plus a
 * `--lab-carousel-progress` property for custom effects). A mouse can drag and flick it; the
 * flick lands on the slide its momentum projects to.
 */
export function Carousel({
  children,
  label,
  slideWidth = 0.82,
  gap = 12,
  align = 'center',
  effect = 'scale',
  index: controlled,
  onIndexChange,
  dots = true,
  controls = 'auto',
  className,
}: CarouselProps) {
  const slides = React.Children.toArray(children).filter(React.isValidElement)
  const track = React.useRef<HTMLDivElement>(null)
  const [current, setCurrent] = React.useState(controlled ?? 0)
  const live = React.useRef({ current, onIndexChange, effect, align })
  live.current = { current, onIndexChange, effect, align }

  const slideEls = () => (track.current ? (Array.from(track.current.children) as HTMLElement[]) : [])
  /** Scroll delta (physical px) that brings slide `i` to rest. */
  const deltaTo = (i: number) => {
    const el = track.current,
      slide = slideEls()[i]
    if (!el || !slide) return 0
    const t = el.getBoundingClientRect(),
      s = slide.getBoundingClientRect()
    const rtl = getComputedStyle(el).direction === 'rtl'
    if (live.current.align === 'start') return rtl ? s.right - t.right : s.left - t.left
    return s.left + s.width / 2 - (t.left + t.width / 2)
  }
  const go = React.useCallback((i: number, smooth = true) => {
    const el = track.current
    if (!el) return
    const target = Math.max(0, Math.min(slideEls().length - 1, i))
    el.scrollBy({ left: deltaTo(target), behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
  }, [])

  // Scroll transitions and the current index, once per frame while the track moves.
  React.useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    let frame = 0
    const paint = () => {
      frame = 0
      const box = el.getBoundingClientRect()
      const all = slideEls()
      if (!all.length) return
      const first = all[0].getBoundingClientRect()
      const step = first.width + gap
      const rtl = getComputedStyle(el).direction === 'rtl'
      const anchor = live.current.align === 'start' ? (rtl ? box.right - first.width / 2 : box.left + first.width / 2) : box.left + box.width / 2
      const progress = all.map((slide) => {
        const r = slide.getBoundingClientRect()
        const p = slideProgress(r.left + r.width / 2, anchor, step)
        const inner = slide.firstElementChild as HTMLElement | null
        slide.style.setProperty('--lab-carousel-progress', p.toFixed(3))
        if (inner && !prefersReducedMotion()) {
          const fx = slideEffect(live.current.effect, p)
          inner.style.transform = fx.transform
          inner.style.opacity = fx.opacity === 1 ? '' : String(fx.opacity)
        }
        return p
      })
      const next = centeredIndex(progress)
      if (next !== live.current.current) {
        setCurrent(next)
        live.current.onIndexChange?.(next)
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    paint()
    el.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', schedule)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [slides.length, gap])

  React.useEffect(() => {
    if (controlled !== undefined && controlled !== live.current.current) go(controlled)
  }, [controlled, go])

  // A mouse drags the track 1:1 and flicks it; snapping waits until the flick lands.
  React.useEffect(() => {
    const el = track.current
    if (!el) return
    const scroll = new MotionValue(0, 0.5)
    scroll.subscribe((v) => (el.scrollLeft = v))
    let start = 0
    return attachPan(el, () => ({
      axis: 'x',
      pointers: ['mouse'],
      threshold: 4,
      onStart: () => {
        scroll.stop()
        el.dataset.dragging = ''
        start = el.scrollLeft
        scroll.set(start)
      },
      onMove: ({ dx, time }) => scroll.track(start - dx, time),
      onEnd: ({ time }) => {
        const velocity = scroll.getVelocity(time)
        const now = el.scrollLeft
        const offsets = slideEls().map((_, i) => now + deltaTo(i))
        const target = flickTarget(now, velocity, offsets, live.current.current)
        void scroll.animateTo(offsets[target], { spring: SPRINGS.release, velocity }).then(() => {
          delete el.dataset.dragging
        })
      },
    }))
  }, [])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0
    if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(slides.length - 1)
    else if (step) go(current + step)
    else return
    event.preventDefault()
  }

  const width = typeof slideWidth === 'number' ? `${slideWidth * 100}%` : slideWidth
  return (
    <section
      className={cn('lab-carousel', className)}
      aria-roledescription="carousel"
      aria-label={label}
      data-controls={controls}
      data-effect={effect}
      style={{ '--lab-carousel-slide': width, '--lab-carousel-gap': `${gap}px` } as React.CSSProperties}
    >
      <div className="lab-carousel-frame">
        <div
          ref={track}
          className="lab-carousel-track"
          data-align={align}
          tabIndex={0}
          aria-label={`${label}, slide ${current + 1} of ${slides.length}`}
          onKeyDown={onKeyDown}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.key ?? i}
              className="lab-carousel-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              <div className="lab-carousel-slide-body">{slide}</div>
            </div>
          ))}
        </div>
        {controls !== 'never' && slides.length > 1 && (
          <>
            <ToolbarGroup label="Previous slide" className="lab-carousel-control" data-side="start">
              <IconButton variant="text" appearance="toolbar" aria-label="Previous slide" disabled={current === 0} onClick={() => go(current - 1)}>
                <ChevronLeft className="lab-dir-flip" />
              </IconButton>
            </ToolbarGroup>
            <ToolbarGroup label="Next slide" className="lab-carousel-control" data-side="end">
              <IconButton
                variant="text"
                appearance="toolbar"
                aria-label="Next slide"
                disabled={current === slides.length - 1}
                onClick={() => go(current + 1)}
              >
                <ChevronRight className="lab-dir-flip" />
              </IconButton>
            </ToolbarGroup>
          </>
        )}
      </div>
      {dots && slides.length > 1 && (
        <div className="lab-carousel-dots" role="group" aria-label={`${label} slides`}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className="lab-carousel-dot"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current || undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
