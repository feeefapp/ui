'use client'

import * as React from 'react'
import { cn } from '../utils'
import type { LabControlVariant } from './control-variants'
import '../system.css'
import './control-variants.css'
import './text-field.css'

export type LabFieldDecorationProps = {
  /** The field's name. It sits inside the empty field and floats up on focus or when a value is present. */
  hint?: string
  label?: string
  /** Text direction of the field. `auto` follows the typed text once the field has a value. */
  dir?: React.HTMLAttributes<HTMLElement>['dir']
  /** Where the floated hint rests: on the border (`outlined`) or inside the field above the value (`inside`). */
  labelStyle?: 'inside' | 'outlined'
  /** Decorative icon at the start of the field. Hidden from assistive technology. */
  leadingIcon?: React.ReactNode
  /** Content at the start of the field, after the icon: a prefix such as `+213` or a currency. */
  leading?: React.ReactNode
  /** Content at the end of the field: a unit, a clear button or another small action. */
  trailing?: React.ReactNode
  /** Help text under the field. Replaced by `error` while there is one. */
  supportingText?: React.ReactNode
  /** Error message under the field. Any non-empty value marks the field invalid. */
  error?: string | null
  /** Class name for the outer wrapper (field plus supporting text), for layout. */
  containerClassName?: string
  /** Surface emphasis, shared with buttons. */
  variant?: LabControlVariant
  /** Field height: `regular` (44px) or `compact` (40px). */
  controlSize?: 'regular' | 'compact'
}
/** What `LabFieldShell` hands its child control so the label and messages stay connected. */
export type LabFieldControlState = {
  /** Put on the control; the floating label points at it. */
  id: string
  /** Put on the control as `aria-describedby`: supporting text, error and counter ids. */
  describedBy: string | undefined
  /** Put on the control as `aria-invalid`. */
  invalid: boolean
}
export type LabFieldShellProps = LabFieldDecorationProps & {
  /** Id for the control. Generated when omitted. */
  id?: string
  /** Dims the field. The child control must also be disabled. */
  disabled?: boolean
  /** Adds a required marker after the hint. The child control enforces it. */
  required?: boolean
  /** Marks the field invalid without showing an error message. */
  invalid?: boolean
  /** Extra ids to include in the control's `aria-describedby`. */
  describedBy?: string
  /** Keeps the hint floated, for controls that hold a value the shell cannot see. */
  populated?: boolean
  /** Always floats the hint, for controls that always show content (dates, colors). */
  alwaysFloat?: boolean
  /** Content at the end of the supporting line, such as a character count. */
  counter?: React.ReactNode
  /** Renders the control, given the id, description ids and invalid state to apply to it. */
  children: (state: LabFieldControlState) => React.ReactNode
}

/**
 * The field frame on its own: surface, floating hint, icons, affixes, supporting text and
 * counter. It paints and labels; the child control owns editing, selection and validation.
 */
export function LabFieldShell({
  id: suppliedId,
  label,
  hint,
  dir,
  labelStyle = 'outlined',
  leadingIcon,
  leading,
  trailing,
  supportingText,
  error,
  containerClassName,
  variant = 'outlined',
  controlSize = 'regular',
  disabled,
  required,
  invalid = false,
  describedBy,
  populated,
  alwaysFloat,
  counter,
  children,
}: LabFieldShellProps) {
  const floatingHint = hint ?? label
  const shellRef = React.useRef<HTMLDivElement>(null)
  const leadingRef = React.useRef<HTMLSpanElement>(null)
  const trailingRef = React.useRef<HTMLSpanElement>(null)
  React.useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const measure = () => {
      shell.style.setProperty(
        '--lab-field-inset-start',
        `${leadingRef.current ? leadingRef.current.getBoundingClientRect().width + 24 : 12}px`
      )
      shell.style.setProperty(
        '--lab-field-inset-end',
        `${trailingRef.current ? trailingRef.current.getBoundingClientRect().width + 24 : 12}px`
      )
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (leadingRef.current) observer?.observe(leadingRef.current)
    if (trailingRef.current) observer?.observe(trailingRef.current)
    return () => observer?.disconnect()
  }, [leadingIcon, leading, trailing])
  const generatedId = React.useId()
  const id = suppliedId || generatedId
  const feedbackId = `${id}-feedback`
  const counterId = `${id}-counter`
  const isInvalid = Boolean(error) || invalid
  const description =
    [describedBy, (error || supportingText) && feedbackId, counter != null && counterId]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div
      className={cn('lab-text-field', containerClassName)}
      dir={dir === 'auto' ? undefined : dir}
      data-control-size={controlSize}
      data-surface-variant={variant}
      data-label-style={labelStyle}
      data-invalid={isInvalid}
      data-disabled={disabled || undefined}
      data-has-label={Boolean(floatingHint)}
    >
      <div ref={shellRef} className="lab-text-field-shell" data-lab-corners>
        {(leadingIcon || leading) && (
          <span ref={leadingRef} className="lab-field-leading">
            {leadingIcon && (
              <span className="lab-text-field-icon" aria-hidden="true">
                {leadingIcon}
              </span>
            )}
            {leading && <span className="lab-text-field-affix">{leading}</span>}
          </span>
        )}
        <div
          className="lab-text-field-edit"
          data-always-float={populated || alwaysFloat || undefined}
        >
          {children({ id, describedBy: description, invalid: isInvalid })}
          {floatingHint && (
            <label htmlFor={id} className="lab-text-field-label">
              {floatingHint}
              {required && <span aria-hidden="true"> *</span>}
            </label>
          )}
        </div>
        {trailing && (
          <span ref={trailingRef} className="lab-text-field-trailing">
            {trailing}
          </span>
        )}
      </div>
      <div className="lab-text-field-details">
        <span id={feedbackId} aria-live="polite">
          {error || supportingText}
        </span>
        {counter != null && <span id={counterId}>{counter}</span>}
      </div>
    </div>
  )
}
