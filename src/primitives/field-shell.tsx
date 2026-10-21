'use client'

import * as React from 'react'
import { cn } from '../utils'
import type { LabControlVariant } from './control-variants'
import '../system.css'
import './control-variants.css'
import './text-field.css'

export type LabFieldDecorationProps = {
  /** Floating field name. Takes precedence over the legacy label prop. */
  hint?: string
  label?: string
  dir?: React.HTMLAttributes<HTMLElement>['dir']
  labelStyle?: 'inside' | 'outlined'
  leadingIcon?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  supportingText?: React.ReactNode
  error?: string | null
  containerClassName?: string
  variant?: LabControlVariant
  controlSize?: 'regular' | 'compact'
}
export type LabFieldControlState = {
  id: string
  describedBy: string | undefined
  invalid: boolean
}
export type LabFieldShellProps = LabFieldDecorationProps & {
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
  populated?: boolean
  alwaysFloat?: boolean
  counter?: React.ReactNode
  children: (state: LabFieldControlState) => React.ReactNode
}

/** Decoration only: the child owns editing, selection and validation behavior. */
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
