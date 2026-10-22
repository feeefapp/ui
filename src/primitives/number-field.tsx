'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../utils'
import { useLabI18n } from '../i18n'
import { LabIconButton } from './button'
import { LabRawInput, type LabInputElement } from './raw-input'
import type { LabControlVariant } from './control-variants'
import {
  clampNumber,
  dragValue,
  fillFraction,
  isBounded,
  keyValue,
  parseNumberExpression,
  stepDecimals,
  type NumberFieldBounds,
} from './number-field-core'
import './control-variants.css'
import './number-field.css'

export type LabNumberFieldProps = {
  /** Shown inside the field at the start; also the accessible name. */
  label: string
  /** Current value (controlled). */
  value?: number
  /** Initial value when uncontrolled, and the value Backspace resets to. */
  defaultValue?: number
  /** Called on every change: each drag move, step and typed commit. */
  onValueChange?: (value: number) => void
  /** Called once a change is final: drag release, step, typed commit. Use it for saves. */
  onValueCommit?: (value: number) => void
  /** Lower bound. With `max` too, the field shows a fill and its width maps to the full range. */
  min?: number
  /** Upper bound. */
  max?: number
  /** Snap interval; also sets the displayed decimals. Shift while dragging scrubs 10× slower. */
  step?: number
  /** Text after the value, e.g. `DA` or `%`. */
  unit?: string
  /** Display text for the value (the typed text and form value stay plain numbers). */
  format?: (value: number) => string
  /** Shows the slider fill. Defaults to true when both bounds are set. */
  fill?: boolean
  /** Shows ‹ › steppers at the ends (on hover and focus). */
  steppers?: boolean
  /** Field paint recipe, shared with text fields and selects. */
  variant?: LabControlVariant
  /** `regular` 44px or `compact` 40px. */
  controlSize?: 'regular' | 'compact'
  disabled?: boolean
  /** Submits the value with forms through a hidden input. */
  name?: string
  form?: string
  className?: string
  id?: string
  'aria-describedby'?: string
}

const DRAG_THRESHOLD = { mouse: 3, pen: 3, touch: 6 }

/**
 * A Blender-style number field. Drag anywhere on it to scrub the value (mouse, pen or finger; Shift
 * for precision dragging), click without dragging to type, and use arrows, Page Up/Down, Home/End or
 * Backspace (reset) from the keyboard. Typed values accept `+ - * /`, parentheses and `%`.
 */
export const LabNumberField = React.forwardRef<HTMLDivElement, LabNumberFieldProps>(function LabNumberField(
  {
    label,
    value: controlled,
    defaultValue,
    onValueChange,
    onValueCommit,
    min,
    max,
    step: stepProp = 1,
    unit,
    format,
    fill,
    steppers = true,
    variant = 'elevated',
    controlSize = 'regular',
    disabled = false,
    name,
    form,
    className,
    id,
    'aria-describedby': describedBy,
  },
  ref
) {
  const { locale, dir } = useLabI18n()
  const step = Number.isFinite(stepProp) && stepProp > 0 ? stepProp : 1
  const bounds: NumberFieldBounds = { min, max, step }
  const bounded = isBounded(bounds)
  const [local, setLocal] = React.useState(() => clampNumber(defaultValue ?? min ?? 0, bounds))
  const value = controlled === undefined ? local : clampNumber(controlled, bounds)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const host = React.useRef<HTMLDivElement>(null)
  const input = React.useRef<LabInputElement>(null)
  const drag = React.useRef<{ x: number; value: number; width: number; moved: boolean; pointer: string } | null>(
    null
  )
  React.useImperativeHandle(ref, () => host.current!, [])

  const decimals = stepDecimals(step)
  const display = React.useMemo(() => {
    if (format) return format(value)
    return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(
      value
    )
  }, [format, value, locale, decimals])
  const valueText = unit ? `${display} ${unit}` : display

  const set = (next: number, commit: boolean) => {
    const clamped = clampNumber(next, bounds)
    if (controlled === undefined) setLocal(clamped)
    if (clamped !== value) onValueChange?.(clamped)
    if (commit) onValueCommit?.(clamped)
    return clamped
  }

  const startEditing = (initial?: string) => {
    if (disabled) return
    setEditing(initial ?? value.toFixed(decimals))
  }
  React.useLayoutEffect(() => {
    if (editing === null) return
    const el = input.current
    if (!el) return
    el.focus({ preventScroll: true })
    if (el.value.length > 1) el.select()
    else el.setSelectionRange(el.value.length, el.value.length)
  }, [editing === null]) // focus once when editing starts

  const finishEditing = (commit: boolean) => {
    if (editing === null) return
    const parsed = commit ? parseNumberExpression(editing) : null
    setEditing(null)
    if (parsed != null) set(parsed, true)
    requestAnimationFrame(() => host.current?.focus({ preventScroll: true }))
  }

  const rtl = (host.current ? getComputedStyle(host.current).direction : dir) === 'rtl'

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || editing !== null || event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-number-stepper]')) return
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = { x: event.clientX, value, width: rect.width, moved: false, pointer: event.pointerType }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer is already gone (released before this handler ran); nothing to capture.
    }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < (DRAG_THRESHOLD[d.pointer as keyof typeof DRAG_THRESHOLD] ?? 3)) return
      d.moved = true
      d.x = event.clientX // start scrubbing from here, so crossing the threshold never jumps
      setDragging(true)
      return
    }
    set(dragValue({ ...bounds, startValue: d.value, dx, width: d.width, fine: event.shiftKey, rtl }), false)
  }
  const endPointer = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!d) return
    if (d.moved) {
      setDragging(false)
      onValueCommit?.(value)
    } else if (!cancelled) startEditing()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || editing !== null) return
    const next = keyValue(event.key, value, bounds, { rtl })
    if (next != null) {
      event.preventDefault()
      set(next, true)
      return
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      startEditing()
    } else if ((event.key === 'Backspace' || event.key === 'Delete') && defaultValue !== undefined) {
      event.preventDefault()
      set(defaultValue, true)
    } else if (/^[\d.,\-+(٠-٩]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      startEditing(event.key)
    }
  }

  const stepBy = (direction: 1 | -1) => set(value + direction * step, true)
  const fraction = (fill ?? bounded) ? fillFraction(value, bounds) : null

  return (
    <div
      ref={host}
      id={id}
      className={cn('lab-number-field lab-control', className)}
      data-surface-variant={variant}
      data-control-size={controlSize}
      data-editing={editing !== null || undefined}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      data-lab-corners
      role={editing !== null ? 'group' : bounded ? 'slider' : 'spinbutton'}
      tabIndex={disabled || editing !== null ? -1 : 0}
      aria-label={label}
      aria-valuenow={editing !== null ? undefined : value}
      aria-valuemin={editing !== null ? undefined : min}
      aria-valuemax={editing !== null ? undefined : max}
      aria-valuetext={editing !== null ? undefined : valueText}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      style={fraction != null ? ({ '--lab-number-fill': fraction } as React.CSSProperties) : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endPointer(event, false)}
      onPointerCancel={(event) => endPointer(event, true)}
      onKeyDown={onKeyDown}
    >
      {fraction != null && <span className="lab-number-field-fill" aria-hidden="true" />}
      {steppers && editing === null && (
        <LabIconButton
          data-number-stepper
          className="lab-number-field-stepper"
          variant="text"
          appearance="toolbar"
          controlSize="compact"
          tabIndex={-1}
          aria-label={`Decrease ${label}`}
          disabled={disabled || (min !== undefined && value <= min)}
          onClick={() => stepBy(-1)}
        >
          <ChevronLeft size={16} className="lab-dir-flip" />
        </LabIconButton>
      )}
      {editing === null ? (
        <span className="lab-number-field-row" aria-hidden="true">
          <span className="lab-number-field-label">{label}</span>
          <span className="lab-number-field-value">
            {display}
            {unit && <span className="lab-number-field-unit">{unit}</span>}
          </span>
        </span>
      ) : (
        <LabRawInput
          ref={input}
          className="lab-number-field-input"
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={editing}
          onValueChange={setEditing}
          onBlur={() => finishEditing(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              finishEditing(true)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              finishEditing(false)
            }
          }}
        />
      )}
      {steppers && editing === null && (
        <LabIconButton
          data-number-stepper
          className="lab-number-field-stepper"
          variant="text"
          appearance="toolbar"
          controlSize="compact"
          tabIndex={-1}
          aria-label={`Increase ${label}`}
          disabled={disabled || (max !== undefined && value >= max)}
          onClick={() => stepBy(1)}
        >
          <ChevronRight size={16} className="lab-dir-flip" />
        </LabIconButton>
      )}
      {name && <input type="hidden" name={name} form={form} value={value} />}
    </div>
  )
})
