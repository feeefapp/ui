'use client'

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref, type KeyboardEventHandler } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { ToolbarGroup } from './toolbar'
import { GlassScope } from './glass/container'
import { IconButton } from './primitives/button'
import { RawInput, type InputElement } from './primitives/raw-input'
import { useI18n } from './i18n'
import { cn } from './utils'
import { stepSearchMorph, searchMorphVisibility } from './toolbar-search-motion'
import './toolbar-search.css'
import { reducedMotionQuery } from './physics/motion-value'

export type ToolbarSearchInputProps = {
  ref: Ref<InputElement>
  id: string
  type: 'search'
  'aria-label': string
  placeholder: string
  value: string
  disabled?: boolean
  tabIndex: number
  className: string
  onValueChange: (value: string) => void
  onKeyDown: KeyboardEventHandler<InputElement>
}
/** Props for ToolbarSearch. */
export type ToolbarSearchProps = {
  /** Accessible name of the search field and its trigger. Also the default placeholder. */
  label: string
  /** The query (controlled). */
  value: string
  /** Called with the new query. Collapsing clears it. */
  onValueChange: (value: string) => void
  /** Placeholder text. Defaults to `label`. */
  placeholder?: string
  /** Controls shown next to the collapsed search button; hidden while the field is open. */
  children?: ReactNode
  /** Content after the search, always visible (it keeps its width while the field expands). */
  trailing?: ReactNode
  disabled?: boolean
  className?: string
  /** Starts open. A non-empty `value` also starts it open. */
  defaultExpanded?: boolean
  /** Ref to the input element. */
  inputRef?: Ref<InputElement>
  /** Replaces the default input, e.g. with a combobox; spread the given props onto it. */
  renderInput?: (props: ToolbarSearchInputProps) => ReactNode
  /** Key handler for the input. Escape is handled first: it collapses and clears. */
  onInputKeyDown?: KeyboardEventHandler<InputElement>
  /** Called when the field opens or collapses. */
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * Search button that springs open into a field inside the same glass pill, taking the free width
 * of its row. Persistent material, stable control geometry and a velocity-preserving spring.
 * Neighbouring bubbles in `children` are absorbed into the search glass as it opens and grow back
 * out of it when it closes.
 */
export function ToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, defaultExpanded = false, inputRef, renderInput, onInputKeyDown, onExpandedChange }: ToolbarSearchProps) {
  const { t } = useI18n()
  const id = useId()
  const [expanded, setExpanded] = useState(defaultExpanded || !!value)
  const [moving, setMoving] = useState(false)
  const [closingValue, setClosingValue] = useState('')
  const main = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const field = useRef<InputElement>(null)
  const spring = useRef({ position: 0, velocity: 0 })
  const target = useRef(0)
  const frame = useRef(0)
  const last = useRef(0)
  const run = useRef(() => {})
  const requested = useRef(expanded)
  const reduced = useRef(false)
  const compact = useRef(46)
  const wide = useRef(46)
  const paint = () => {
    const progress = Math.min(1, Math.max(0, (spring.current.position - compact.current) / Math.max(1, wide.current - compact.current)))
    const opacity = searchMorphVisibility(progress)
    main.current?.style.setProperty('--lab-search-width', `${spring.current.position}px`)
    main.current?.style.setProperty('--lab-search-editor-opacity', String(opacity.editor))
    main.current?.style.setProperty('--lab-search-controls-opacity', String(opacity.controls))
  }
  const start = () => {
    if (reduced.current) {
      spring.current = { position: target.current, velocity: 0 }
      paint(); setMoving(false)
      return
    }
    setMoving(true)
    if (frame.current) return
    last.current = performance.now()
    const tick = (now: number) => {
      spring.current = stepSearchMorph(spring.current, target.current, (now - last.current) / 1000)
      last.current = now
      if (Math.abs(spring.current.position - target.current) < .15 && Math.abs(spring.current.velocity) < .6) {
        spring.current = { position: target.current, velocity: 0 }
        paint(); frame.current = 0; setMoving(false)
        return
      }
      paint(); frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }
  run.current = start
  useLayoutEffect(() => {
    const host = main.current, material = surface.current
    if (!host || !material) return
    const media = reducedMotionQuery()
    reduced.current = media.matches
    const measure = (initial = false) => {
      compact.current = (Number.parseFloat(getComputedStyle(material).getPropertyValue('--lab-toolbar-control')) || 38) + 6
      host.style.setProperty('--lab-search-compact-width', `${compact.current}px`)
      wide.current = Math.max(compact.current, host.clientWidth)
      target.current = requested.current ? wide.current : compact.current
      if (initial) { spring.current = { position: target.current, velocity: 0 }; paint() }
      else run.current()
    }
    measure(true)
    let width = host.clientWidth
    const observer = new ResizeObserver(() => { if (host.clientWidth !== width) { width = host.clientWidth; measure() } })
    observer.observe(host)
    const motion = () => { reduced.current = media.matches; run.current() }
    media.addEventListener('change', motion)
    return () => { cancelAnimationFrame(frame.current); frame.current = 0; observer.disconnect(); media.removeEventListener('change', motion) }
  }, [])
  useLayoutEffect(() => {
    requested.current = expanded
    target.current = expanded ? wide.current : compact.current
    if (spring.current.position !== target.current) run.current()
    else setMoving(false)
    if (expanded) field.current?.focus({ preventScroll: true })
  }, [expanded])
  const change = (next: boolean) => {
    if (next === expanded) return
    if (!next) {
      setClosingValue(value)
      if (value) onValueChange('')
      trigger.current?.focus({ preventScroll: true })
    }
    setMoving(true); setExpanded(next); onExpandedChange?.(next)
  }
  const input: ToolbarSearchInputProps = {
    ref: node => { field.current = node; if (typeof inputRef === 'function') inputRef(node); else if (inputRef) inputRef.current = node },
    id, type: 'search', 'aria-label': label, placeholder: placeholder ?? label,
    value: expanded ? value : moving ? closingValue : value, disabled, tabIndex: expanded ? 0 : -1,
    className: 'lab-toolbar-search-input', onValueChange,
    onKeyDown: event => {
      if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); change(false) }
      else onInputKeyDown?.(event)
    },
  }
  // Its own glass container when standalone, so neighbours can be absorbed into it; inside an app
  // bar or toolbar it joins that one.
  return <GlassScope className={cn('lab-toolbar-search', className)} role="group" aria-label={label} data-expanded={expanded} data-moving={moving}>
    <div ref={main} className="lab-toolbar-search-main">
      <ToolbarGroup ref={surface} label={label} className="lab-toolbar-search-surface" glassMotion="follow">
        <IconButton ref={trigger} variant="text" appearance="toolbar" controlSize="regular" aria-label={expanded ? t('lab.search.collapse') : label} aria-expanded={expanded} aria-controls={id} disabled={disabled} onClick={() => change(!expanded)}>
          <span className="lab-toolbar-search-glyph" data-expanded={expanded}><Search/><ArrowLeft className="lab-dir-flip"/></span>
        </IconButton>
        <div className="lab-toolbar-search-editor" inert={!expanded} aria-hidden={!expanded}>
          {renderInput ? renderInput(input) : <RawInput {...input}/>}
          <IconButton variant="text" appearance="toolbar" controlSize="regular" aria-label={t('lab.search.clear')} disabled={!value || disabled} onClick={() => { if (value) onValueChange(''); field.current?.focus({preventScroll:true}) }}><X/></IconButton>
        </div>
      </ToolbarGroup>
      <div className="lab-toolbar-search-controls" inert={expanded || moving} aria-hidden={expanded || moving}>{children}</div>
    </div>
    {trailing && <div className="lab-toolbar-search-trailing">{trailing}</div>}
  </GlassScope>
}
