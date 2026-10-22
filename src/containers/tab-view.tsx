'use client'

import * as React from 'react'
import { GlassGroup } from '../scaffold'
import { animateLayoutFrom, snapshotLayout } from '../physics/layout-group'
import { MotionValue, prefersReducedMotion } from '../physics/motion-value'
import { SPRINGS, springTiming } from '../physics/spring'
import { cn } from '../utils'
import './tab-view.css'

export type Tab = {
  /** Stable id; also the value of `value`. */
  id: string
  /** Short label in sentence case (one word is best). */
  label: string
  /** Icon shown above (phones) or before (wide) the label. */
  icon: React.ReactNode
  /** A count or dot on the icon, e.g. unconfirmed orders. */
  badge?: React.ReactNode
  /** The tab's content, usually a NavigationStack. It stays mounted while other tabs show. */
  content: React.ReactNode
}

export type TabViewProps = {
  /** 2–5 top-level destinations. */
  tabs: readonly Tab[]
  /** Selected tab id (controlled). */
  value: string
  /** Called when the person picks another tab. */
  onChange: (id: string) => void
  /**
   * Called when the person picks the tab that is already selected: pop its stack to the root,
   * or (the default) scroll its content back to the top.
   */
  onReselect?: (id: string) => void
  /**
   * `scroll` (default): the bar shrinks to the selected tab while content scrolls down and comes
   * back on scroll up or a tap, like iOS 26. `never` keeps it full.
   */
  minimize?: 'scroll' | 'never'
  /** A persistent control beside the tabs (a mini player, a call in progress). Sits above the bar, and beside it when minimized. */
  accessory?: React.ReactNode
  /** Accessible name of the tab bar. */
  label?: string
  className?: string
}

const SNAPPY = springTiming(SPRINGS.snappy)

/**
 * App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
 * tab bar switches between them, and while the person scrolls down it shrinks to the selected
 * tab so content gets the screen. Picking the current tab again returns it to the top.
 */
export function TabView({
  tabs,
  value,
  onChange,
  onReselect,
  minimize = 'scroll',
  accessory,
  label = 'Tabs',
  className,
}: TabViewProps) {
  const id = React.useId()
  const root = React.useRef<HTMLDivElement>(null)
  const bar = React.useRef<HTMLDivElement>(null)
  const chrome = React.useRef<HTMLDivElement>(null)
  const panels = React.useRef(new Map<string, HTMLElement>())
  const [minimized, setMinimized] = React.useState(false)
  const [visited, setVisited] = React.useState(() => new Set([value]))
  if (!visited.has(value)) setVisited(new Set(visited).add(value))
  const pending = React.useRef<ReturnType<typeof snapshotLayout> | null>(null)

  // The bar's own height becomes extra bottom space for every scroll area inside the tabs.
  React.useLayoutEffect(() => {
    const el = chrome.current,
      host = root.current
    if (!el || !host) return
    // Measured only while full: shrinking the reserve would clamp scroll positions and read as a
    // scroll up, expanding the bar again.
    const measure = () => {
      if (!el.hasAttribute('data-minimized')) host.style.setProperty('--lab-tab-chrome', `${el.offsetHeight}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [Boolean(accessory)])

  /** Minimizing morphs the chrome: snapshot the pieces, change state, spring them to their new place. */
  const setMinimizedMorph = (next: boolean) => {
    if (next === minimized) return
    const pieces = chrome.current?.querySelectorAll<HTMLElement>('[data-lab-tab-piece]')
    pending.current = pieces ? snapshotLayout(pieces) : null
    setMinimized(next)
  }
  React.useLayoutEffect(() => {
    if (pending.current) animateLayoutFrom(pending.current, { spring: SPRINGS.snappy })
    pending.current = null
  }, [minimized])

  // Shrink while the person reads down; come back when they scroll up or reach the top.
  const live = React.useRef({ minimized, minimize, value })
  live.current = { minimized, minimize, value }
  React.useEffect(() => {
    const host = root.current
    if (!host) return
    const last = new WeakMap<EventTarget, number>()
    const onScroll = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || live.current.minimize !== 'scroll') return
      const panel = panels.current.get(live.current.value)
      if (!panel?.contains(target)) return
      const top = target.scrollTop
      const previous = last.get(target) ?? 0
      last.set(target, top)
      if (top < 24) setMinimizedMorphRef.current(false)
      else if (top - previous > 6) setMinimizedMorphRef.current(true)
      else if (previous - top > 10) setMinimizedMorphRef.current(false)
    }
    host.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => host.removeEventListener('scroll', onScroll, { capture: true })
  }, [])
  const setMinimizedMorphRef = React.useRef(setMinimizedMorph)
  setMinimizedMorphRef.current = setMinimizedMorph

  // A switched-to panel fades in quickly; it never slides (tabs are siblings, not depth).
  const fade = React.useRef(new MotionValue(1, 0.004)).current
  const previous = React.useRef(value)
  React.useLayoutEffect(() => {
    if (previous.current === value) return
    previous.current = value
    const panel = panels.current.get(value)
    if (!panel || prefersReducedMotion()) return
    const unsubscribe = fade.subscribe((v) => (panel.style.opacity = String(v)))
    fade.set(0)
    void fade.animateTo(1, { spring: { duration: 0.22, bounce: 0 } }).then(() => {
      unsubscribe()
      panel.style.opacity = ''
    })
    return unsubscribe
  }, [value])

  const pick = (tab: Tab) => {
    if (tab.id === value) {
      setMinimizedMorph(false)
      if (onReselect) onReselect(tab.id)
      else
        panels.current
          .get(tab.id)
          ?.querySelector('.lab-scroll-viewport')
          ?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      return
    }
    setMinimizedMorph(false)
    onChange(tab.id)
  }
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((t) => t.id === value)
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const keys: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }
    let next = -1
    if (event.key in keys) next = (index + keys[event.key] + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next < 0) return
    event.preventDefault()
    onChange(tabs[next].id)
    bar.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div
      ref={root}
      className={cn('lab-tab-view', className)}
      style={{ '--lab-tab-ease': SNAPPY.easing, '--lab-tab-duration': `${SNAPPY.duration}ms` } as React.CSSProperties}
    >
      {tabs.map((tab) =>
        visited.has(tab.id) ? (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) panels.current.set(tab.id, el)
              else panels.current.delete(tab.id)
            }}
            id={`${id}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${tab.id}`}
            className="lab-tab-panel"
            data-active={tab.id === value || undefined}
            inert={tab.id !== value || undefined}
          >
            {tab.content}
          </div>
        ) : null
      )}
      <div ref={chrome} className="lab-tab-chrome" data-minimized={minimized || undefined}>
        {accessory && (
          <GlassGroup className="lab-tab-accessory" data-lab-tab-piece="">
            {accessory}
          </GlassGroup>
        )}
        <GlassGroup
          ref={bar as React.Ref<HTMLElement>}
          className="lab-tab-bar"
          role="tablist"
          aria-label={label}
          data-lab-tab-piece=""
          onKeyDown={onKeyDown}
          onClick={() => minimized && setMinimizedMorph(false)}
        >
          {tabs.map((tab) => {
            const selected = tab.id === value
            return (
              <button
                key={tab.id}
                id={`${id}-tab-${tab.id}`}
                type="button"
                role="tab"
                className="lab-tab"
                aria-selected={selected}
                aria-controls={`${id}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                data-selected={selected || undefined}
                onClick={(event) => {
                  if (minimized) {
                    event.stopPropagation()
                    setMinimizedMorph(false)
                    return
                  }
                  pick(tab)
                }}
              >
                <span className="lab-tab-icon" aria-hidden="true">
                  {tab.icon}
                  {tab.badge !== undefined && tab.badge !== null && tab.badge !== false && (
                    <span className="lab-tab-badge">{tab.badge}</span>
                  )}
                </span>
                <span className="lab-tab-label">{tab.label}</span>
                {(typeof tab.badge === 'string' || typeof tab.badge === 'number') && (
                  <span className="lab-sr-only">, {tab.badge}</span>
                )}
              </button>
            )
          })}
        </GlassGroup>
      </div>
    </div>
  )
}
