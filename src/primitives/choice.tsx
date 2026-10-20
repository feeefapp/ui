'use client'

import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../utils'
import './choice.css'

type ChoiceDecoration = {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: string | null
  controlSize?: 'regular' | 'compact'
  containerClassName?: string
}
export type LabCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children'
> &
  ChoiceDecoration & {
    indeterminate?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
export type LabRadioProps = Omit<LabCheckboxProps, 'indeterminate'>

type ChoiceProps = LabCheckboxProps & {
  kind: 'checkbox' | 'radio'
  forwardedRef: React.ForwardedRef<HTMLInputElement>
}
function Choice({
  kind,
  forwardedRef,
  label,
  description,
  error,
  controlSize = 'regular',
  containerClassName,
  indeterminate = false,
  onCheckedChange,
  className,
  'id': suppliedId,
  onChange,
  'aria-describedby': describedBy,
  ...props
}: ChoiceProps) {
  const generated = React.useId()
  const id = suppliedId || generated
  const node = React.useRef<HTMLInputElement | null>(null)
  React.useLayoutEffect(() => {
    if (node.current) {
      node.current.indeterminate = kind === 'checkbox' && indeterminate
      node.current.setCustomValidity(error || '')
    }
  }, [kind, indeterminate, error])
  return (
    <label
      className={cn('lab-choice', containerClassName)}
      data-kind={kind}
      data-control-size={controlSize}
      data-disabled={props.disabled || undefined}
      data-invalid={Boolean(error) || undefined}
    >
      <input
        {...props}
        type={kind}
        id={id}
        ref={(el) => {
          node.current = el
          if (el) el.indeterminate = kind === 'checkbox' && indeterminate
          if (typeof forwardedRef === 'function') forwardedRef(el)
          else if (forwardedRef) forwardedRef.current = el
        }}
        className={cn('lab-choice-input', className)}
        aria-labelledby={
          props['aria-labelledby'] || (!props['aria-label'] && label ? `${id}-label` : undefined)
        }
        aria-checked={kind === 'checkbox' && indeterminate ? 'mixed' : props['aria-checked']}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [describedBy, description && `${id}-description`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined
        }
        onChange={(event) => {
          onCheckedChange?.(event.currentTarget.checked)
          onChange?.(event)
        }}
      />
      <span className="lab-choice-mark" aria-hidden="true">
        {kind === 'checkbox' ? (
          <>
            <Check className="lab-choice-check" size={14} strokeWidth={2.5} />
            <Minus className="lab-choice-mixed" size={14} strokeWidth={2.5} />
          </>
        ) : (
          <span className="lab-choice-dot" />
        )}
      </span>
      {(label || description || error) && (
        <span className="lab-choice-copy">
          {label && (
            <span id={`${id}-label`}>
              {label}
              {props.required && kind === 'checkbox' && <span aria-hidden="true"> *</span>}
            </span>
          )}
          {description && <small id={`${id}-description`}>{description}</small>}
          {error && (
            <small id={`${id}-error`} className="lab-choice-error" aria-live="polite">
              {error}
            </small>
          )}
        </span>
      )}
    </label>
  )
}
export const LabCheckbox = React.forwardRef<HTMLInputElement, LabCheckboxProps>((props, ref) => (
  <Choice {...props} kind="checkbox" forwardedRef={ref} />
))
LabCheckbox.displayName = 'LabCheckbox'
export const LabRadio = React.forwardRef<HTMLInputElement, LabRadioProps>((props, ref) => (
  <Choice {...props} kind="radio" forwardedRef={ref} />
))
LabRadio.displayName = 'LabRadio'

export type LabRadioOption = {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}
export type LabRadioGroupProps = Omit<
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue'
> & {
  label: React.ReactNode
  options: readonly LabRadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  form?: string
  required?: boolean
  error?: string | null
  description?: React.ReactNode
  controlSize?: 'regular' | 'compact'
}
/** Native radios own keyboard navigation, form submission and reset; fieldset owns the group label. */
export const LabRadioGroup = React.forwardRef<HTMLFieldSetElement, LabRadioGroupProps>(
  (
    {
      label,
      options,
      value,
      defaultValue,
      onValueChange,
      name,
      form,
      required,
      error,
      description,
      controlSize,
      className,
      'aria-describedby': describedBy,
      ...props
    },
    ref
  ) => {
    const id = React.useId()
    const group = React.useRef<HTMLFieldSetElement | null>(null)
    React.useLayoutEffect(() => {
      group.current
        ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
        .forEach((input) => input.setCustomValidity(error || ''))
    }, [error, options])
    return (
      <fieldset
        {...props}
        ref={(el) => {
          group.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        form={form}
        className={cn('lab-radio-group', className)}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [describedBy, description && `${id}-description`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        <legend>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </legend>
        {description && <p id={`${id}-description`}>{description}</p>}
        <div className="lab-radio-group-options">
          {options.map((option) => (
            <LabRadio
              key={option.value}
              label={option.label}
              description={option.description}
              value={option.value}
              name={name || id}
              form={form}
              checked={value === undefined ? undefined : value === option.value}
              defaultChecked={value === undefined ? defaultValue === option.value : undefined}
              disabled={props.disabled || option.disabled}
              required={required}
              controlSize={controlSize}
              aria-describedby={error ? `${id}-error` : undefined}
              aria-invalid={error ? true : undefined}
              onCheckedChange={(checked) => {
                if (checked) onValueChange?.(option.value)
              }}
            />
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} className="lab-choice-error" aria-live="polite">
            {error}
          </p>
        )}
      </fieldset>
    )
  }
)
LabRadioGroup.displayName = 'LabRadioGroup'
