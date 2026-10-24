'use client'

import * as React from 'react'
import { GlassGroup } from '../scaffold'
import { MotionValue, prefersReducedMotion } from '../physics/motion-value'
import { SelectionTrack, type SelectionSource } from '../primitives/selection-track'
import { cn } from '../utils'
import './tab-view.css'
import { GlassBar, GlassScope } from '../glass/container'

export type Tab = {
  /** Stable id; also the value of `value`. */
  id: string
  /** Short label in sentence case (one word is best). */
  label: string
  /** Icon shown above (phones) or before (wide) the label. */
  icon: React.ReactNode
  /** A short count on the icon's corner for something that needs action, e.g. unconfirmed orders
   * ("8"). It is part of the tab's accessible name ("Orders, 8"). */
  badge?: string
  /** The tab's content, usually a NavigationStack. It stays mounted while other tabs show. */
  content: React.ReactNode
}

export type TabViewProps = {
  /** 2–5 top-level destinations. */
  tabs: readonly Tab[]
  /** Selected tab id (controlled). */
  value: string
  /** Called when the person picks another tab: a tap, a drag of the selection released on it, or an
   * arrow, Home or End key (tabs activate as the keyboard reaches them). */
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

/**
 * App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
 * tab bar switches between them, and while the person scrolls down it shrinks to the selected
 * tab so content gets the screen. Picking the current tab again returns it to the top.
 *
 * The bar is a segmented control with tab semantics (the shared selection track): press the
 * selected tab and it becomes a glass lens you can drag across the tabs; the tab under it on
 * release is chosen. Tabs can carry a count (`badge`).
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
  const chrome = React.useRef<HTMLDivElement>(null)
  const panels = React.useRef(new Map<string, HTMLElement>())
  const [minimized, setMinimized] = React.useState(false)
  const [visited, setVisited] = React.useState(() => new Set([value]))
  if (!visited.has(value)) setVisited(new Set(visited).add(value))

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

  /** Minimizing changes the layout; the chrome's glass container springs the bubbles and their content. */
  const setMinimizedMorph = (next: boolean) => {
    if (next !== minimized) setMinimized(next)
  }

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

  const reselect = (tabId: string) => {
    if (onReselect) onReselect(tabId)
    else
      panels.current
        .get(tabId)
        ?.querySelector('.lab-scroll-viewport')
        ?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  const select = (next: string, source: SelectionSource) => {
    // Keys activate the tab they reach and leave the bar as it is.
    if (source === 'key') return onChange(next)
    // A press on the small bar only brings it back.
    if (minimized && source === 'press') return setMinimizedMorph(false)
    setMinimizedMorph(false)
    if (next === value) reselect(next)
    else onChange(next)
  }

  return (
    <div
      ref={root}
      className={cn('lab-tab-view', className)}
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
      <GlassBar>
        <GlassScope ref={chrome} className="lab-tab-chrome" data-minimized={minimized || undefined}>
          {accessory && (
            <GlassGroup className="lab-tab-accessory" data-lab-tab-piece="" glassId="accessory">
              {accessory}
            </GlassGroup>
          )}
          <GlassGroup
            glassId="tabs"
            className="lab-tab-bar"
            data-lab-tab-piece=""
            onClick={() => minimized && setMinimizedMorph(false)}
          >
            <SelectionTrack
              semantics="tab"
              layout="stacked"
              pill="tinted"
              className="lab-tab-track"
              label={label}
              value={value}
              onSelect={select}
              draggable={!minimized}
              collapsed={minimized}
              options={tabs.map((tab) => ({
                value: tab.id,
                label: tab.label,
                icon: tab.icon,
                badge: tab.badge,
                id: `${id}-tab-${tab.id}`,
                controls: `${id}-panel-${tab.id}`,
              }))}
            />
          </GlassGroup>
        </GlassScope>
      </GlassBar>
    </div>
  )
}
