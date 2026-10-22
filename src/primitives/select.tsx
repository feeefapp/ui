'use client'

import { PopoverSurface } from './popover-surface'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../utils'
import { FieldShell, type FieldDecorationProps } from './field-shell'
import { RawInput, type InputValidator } from './raw-input'

export type SelectProps = FieldDecorationProps & {
  /** The `Option` items of the menu. */
  'children': React.ReactNode
  /** The selected option's value. `null` or `''` means nothing is selected. */
  'value': string | null
  /** Called with the chosen option's value (`''` for an option without one). */
  'onValueChange': (value: string) => void
  /** Class name for the trigger button. */
  'className'?: string
  /** Accessible name when the select has no `hint`. */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Id for the trigger button. Generated when omitted. */
  'id'?: string
  /** Text shown while nothing is selected. Only used when there is no `hint`. */
  'placeholder'?: string
  /** Disables the trigger and closes the menu. */
  'disabled'?: boolean
  /** Form field name; the value is submitted with the form. */
  'name'?: string
  /** An empty selection blocks form submission and shows `requiredMessage`. */
  'required'?: boolean
  /** Error shown when a required select is empty. */
  'requiredMessage'?: string
  /** Synchronous check run on the value; return an actionable error, or nothing when it is valid. */
  'validator'?: InputValidator
  /** When errors appear: after the menu first closes or the trigger blurs (`blur`), on every change (`change`) or only on submit (`submit`). */
  'validationMode'?: 'blur' | 'change' | 'submit'
  /** Called with the visible error message, or `null` when it clears. */
  'onValidationChange'?: (error: string | null) => void
  'onBlur'?: React.FocusEventHandler<HTMLButtonElement>
}

const EMPTY = '__lab_natural__'

/**
 * A single-choice dropdown in the same field frame as `TextField`: floating hint, icons,
 * supporting text and validation. The menu opens in a popover; options are `Option`.
 */
export function Select({
  children,
  value: suppliedValue,
  onValueChange,
  className,
  variant = 'elevated',
  controlSize = 'regular',
  label,
  hint,
  dir,
  placeholder,
  labelStyle = 'outlined',
  leadingIcon,
  leading,
  trailing,
  supportingText,
  error,
  containerClassName,
  name,
  required,
  requiredMessage = 'Choose an option.',
  validator,
  validationMode = 'blur',
  onValidationChange,
  onBlur,
  ...props
}: SelectProps) {
  const value = suppliedValue ?? ''
  const floatingHint = hint ?? label
  const touched = React.useRef(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const validateValue = React.useCallback(
    (next: string) => (required && !next ? requiredMessage : validator?.(next)) || null,
    [required, requiredMessage, validator]
  )
  const publishError = React.useCallback(
    (next: string | null) => {
      setValidationError(next)
      onValidationChange?.(next)
    },
    [onValidationChange]
  )
  const validate = React.useCallback(
    (next: string) => publishError(validateValue(next)),
    [publishError, validateValue]
  )
  React.useEffect(() => {
    if (touched.current && validationMode !== 'submit') validate(value)
  }, [value, validate, validationMode])
  const decorated = Boolean(
    floatingHint ||
    placeholder ||
    leadingIcon ||
    leading ||
    trailing ||
    supportingText ||
    error ||
    validationError ||
    required ||
    validator
  )
  const message = error ?? validationError
  const trigger = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    const form = trigger.current?.form
    const reset = () => {
      touched.current = false
      publishError(null)
    }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [publishError])
  const [resolvedDirection, setResolvedDirection] = React.useState<'ltr' | 'rtl'>(
    dir === 'rtl' ? 'rtl' : 'ltr'
  )
  React.useLayoutEffect(() => {
    const sync = () => {
      const inherited = trigger.current?.parentElement
        ? getComputedStyle(trigger.current.parentElement).direction
        : 'ltr'
      setResolvedDirection(
        dir === 'ltr' || dir === 'rtl' ? dir : inherited === 'rtl' ? 'rtl' : 'ltr'
      )
    }
    sync()
    const observer = new MutationObserver(sync)
    let ancestor: HTMLElement | null = trigger.current?.parentElement || null
    while (ancestor) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['dir', 'class', 'style'] })
      ancestor = ancestor.parentElement
    }
    return () => observer.disconnect()
  }, [dir])
  const [container, setContainer] = React.useState<HTMLElement>()
  // Radix unmounts Select content immediately, so hold it open while it fades.
  const [open, setOpen] = React.useState(false),
    [closing, setClosing] = React.useState(false)
  const closeTimer = React.useRef(0)
  React.useEffect(() => () => clearTimeout(closeTimer.current), [])
  React.useEffect(() => {
    if (!props.disabled) return
    clearTimeout(closeTimer.current)
    setClosing(false)
    setOpen(false)
  }, [props.disabled])
  return (
    <SelectPrimitive.Root
      dir={resolvedDirection}
      value={value || EMPTY}
      onValueChange={(next) => {
        if (!closing && !props.disabled) {
          const selected = next === EMPTY ? '' : next
          onValueChange(selected)
          if (validationMode === 'change' || (touched.current && validationMode === 'blur'))
            validate(selected)
        }
      }}
      open={open}
      onOpenChange={(next) => {
        clearTimeout(closeTimer.current)
        if (next) {
          setContainer(trigger.current?.closest('dialog') || undefined)
          setClosing(false)
          setOpen(true)
          return
        }
        touched.current = true
        if (validationMode !== 'submit') validate(value)
        setClosing(true)
        closeTimer.current = window.setTimeout(
          () => {
            setOpen(false)
            setClosing(false)
          },
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 140
        )
      }}
      disabled={props.disabled}
    >
      {decorated ? (
        <FieldShell
          id={props.id}
          label={label}
          hint={hint}
          dir={dir}
          labelStyle={labelStyle}
          variant={variant}
          controlSize={controlSize}
          leadingIcon={leadingIcon}
          leading={leading}
          trailing={trailing}
          supportingText={supportingText}
          error={message}
          containerClassName={containerClassName}
          disabled={props.disabled}
          required={required}
          describedBy={props['aria-describedby']}
          invalid={props['aria-invalid'] === true || props['aria-invalid'] === 'true'}
          populated={Boolean(value)}
        >
          {({ id, describedBy, invalid }) => (
            <SelectPrimitive.Trigger
              ref={trigger}
              id={id}
              className={cn('lab-field-select-control', className)}
              aria-label={props['aria-label']}
              aria-labelledby={props['aria-labelledby']}
              aria-describedby={describedBy}
              aria-invalid={invalid || props['aria-invalid']}
              aria-required={required || undefined}
              onBlur={(event) => {
                if (!open) {
                  touched.current = true
                  if (validationMode !== 'submit') validate(value)
                }
                onBlur?.(event)
              }}
            >
              <span className="lab-field-select-value">
                <SelectPrimitive.Value>
                  {!value && !floatingHint && placeholder ? placeholder : undefined}
                </SelectPrimitive.Value>
              </span>
              <SelectPrimitive.Icon>
                <ChevronDown size={18} aria-hidden="true" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
          )}
        </FieldShell>
      ) : (
        <SelectPrimitive.Trigger
          ref={trigger}
          className={cn('lab-select lab-control', className)}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
          aria-invalid={props['aria-invalid']}
          aria-required={required || undefined}
          id={props.id}
          data-surface-variant={variant}
          data-control-size={controlSize}
          data-lab-corners
          onBlur={(event) => {
            if (!open) {
              touched.current = true
              if (validationMode !== 'submit') validate(value)
            }
            onBlur?.(event)
          }}
        >
          <SelectPrimitive.Value>
            {!value && !floatingHint && placeholder ? placeholder : undefined}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon>
            <ChevronDown size={18} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      )}
      {(required || validator || name || error) && (
        <RawInput
          className="lab-sr-only"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={() => {}}
          name={name}
          required={required}
          disabled={props.disabled}
          error={error}
          validator={validateValue}
          validationMode="submit"
          onValidationChange={publishError}
          onInvalid={(event) => {
            event.preventDefault()
            touched.current = true
            trigger.current?.focus()
          }}
        />
      )}
      <SelectPrimitive.Portal container={container}>
        <PopoverSurface asChild>
          <SelectPrimitive.Content
            className="lab-select-menu"
            data-lab-corners
            data-closing={closing || undefined}
            inert={closing || undefined}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            collisionBoundary={container}
          >
            <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </PopoverSurface>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

/** One choice in a `Select` menu. A check marks the selected option. */
export function Option({
  value,
  children,
}: {
  /** The value passed to `onValueChange`. Defaults to the text of `children`; `''` is the "no selection" option. */
  value?: string
  /** The option's visible text, also shown in the trigger when selected. */
  children: React.ReactNode
}) {
  return (
    <SelectPrimitive.Item
      data-lab-corners
      className="lab-select-option"
      value={(value ?? String(children)) || EMPTY}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check size={18} aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
