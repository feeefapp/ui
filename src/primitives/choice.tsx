'use client'

import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../utils'
import './choice.css'

type ChoiceDecoration = {
  /** Visible label next to the mark. Clicking it toggles the control. */
  label?: React.ReactNode
  /** Secondary text under the label, linked as the control's description. */
  description?: React.ReactNode
  /** Error message under the label. Marks the control invalid and blocks form submission. */
  error?: string | null
  /** Row size: `regular` (as tall as a regular button) or `small`. */
  controlSize?: 'small' | 'regular'
  /** Class name for the outer `<label>`, for layout. */
  containerClassName?: string
}
export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children'
> &
  ChoiceDecoration & {
    /** Shows a dash for a partly selected group and reports `aria-checked="mixed"`. Derive it from your own state; it does not clear itself. */
    indeterminate?: boolean
    /** Called with the new checked state. */
    onCheckedChange?: (checked: boolean) => void
  }
export type RadioProps = Omit<CheckboxProps, 'indeterminate'>

type ChoiceProps = CheckboxProps & {
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
/** A native checkbox with a label, description, error and indeterminate state. */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => (
  <Choice {...props} kind="checkbox" forwardedRef={ref} />
))
Checkbox.displayName = 'Checkbox'
/** A single native radio with a label and description. Prefer `RadioGroup`, which names and labels the set. */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>((props, ref) => (
  <Choice {...props} kind="radio" forwardedRef={ref} />
))
Radio.displayName = 'Radio'

/** One entry in `RadioGroup`'s `options`. */
export type RadioOption = {
  /** The value submitted and passed to `onValueChange`. Must be unique in the group. */
  value: string
  /** Visible label. */
  label: React.ReactNode
  /** Secondary text under the label. */
  description?: React.ReactNode
  /** Disables this option only. */
  disabled?: boolean
}
export type RadioGroupProps = Omit<
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue'
> & {
  /** The group's question, rendered as the fieldset legend. */
  label: React.ReactNode
  /** The choices, in order. */
  options: readonly RadioOption[]
  /** The selected value, for a controlled group. */
  value?: string
  /** The initially selected value, for an uncontrolled group. */
  defaultValue?: string
  /** Called with the newly selected option's value. */
  onValueChange?: (value: string) => void
  /** Form field name shared by the radios. Generated when omitted. */
  name?: string
  /** Id of a form outside the group that the radios belong to. */
  form?: string
  /** Requires a choice before the form submits; adds a marker to the legend. */
  required?: boolean
  /** Error message under the options. Marks the group invalid and blocks form submission. */
  error?: string | null
  /** Help text under the legend. */
  description?: React.ReactNode
  /** Size of every radio row: `regular` or `small`. */
  controlSize?: 'small' | 'regular'
}
/**
 * A labelled set of mutually exclusive choices. Native radios own keyboard navigation, form
 * submission and reset; the `<fieldset>` and `<legend>` own the group label.
 */
export const RadioGroup = React.forwardRef<HTMLFieldSetElement, RadioGroupProps>(
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
            <Radio
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
RadioGroup.displayName = 'RadioGroup'
