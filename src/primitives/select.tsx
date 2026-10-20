'use client'

import { LabPopoverSurface } from './popover-surface'
import * as React from 'react'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../utils'
import { LabFieldShell, type LabFieldDecorationProps } from './field-shell'
import { LabRawInput, type LabInputValidator } from './raw-input'

export type LabSelectProps = LabFieldDecorationProps & {
  'children': React.ReactNode
  'value': string | null
  'onValueChange': (value: string) => void
  'className'?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  'id'?: string
  'placeholder'?: string
  'disabled'?: boolean
  'name'?: string
  'required'?: boolean
  'requiredMessage'?: string
  'validator'?: LabInputValidator
  'validationMode'?: 'blur' | 'change' | 'submit'
  'onValidationChange'?: (error: string | null) => void
  'onBlur'?: React.FocusEventHandler<HTMLButtonElement>
}

const EMPTY = '__lab_natural__'

export function LabSelect({
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
}: LabSelectProps) {
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
    <Select.Root
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
        <LabFieldShell
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
            <Select.Trigger
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
                <Select.Value>
                  {!value && !floatingHint && placeholder ? placeholder : undefined}
                </Select.Value>
              </span>
              <Select.Icon>
                <ChevronDown size={18} aria-hidden="true" />
              </Select.Icon>
            </Select.Trigger>
          )}
        </LabFieldShell>
      ) : (
        <Select.Trigger
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
          <Select.Value>
            {!value && !floatingHint && placeholder ? placeholder : undefined}
          </Select.Value>
          <Select.Icon>
            <ChevronDown size={18} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
      )}
      {(required || validator || name || error) && (
        <LabRawInput
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
      <Select.Portal container={container}>
        <LabPopoverSurface asChild>
          <Select.Content
            className="lab-select-menu"
            data-lab-corners
            data-closing={closing || undefined}
            inert={closing || undefined}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            collisionBoundary={container}
          >
            <Select.Viewport>{children}</Select.Viewport>
          </Select.Content>
        </LabPopoverSurface>
      </Select.Portal>
    </Select.Root>
  )
}

export function LabOption({ value, children }: { value?: string; children: React.ReactNode }) {
  return (
    <Select.Item
      data-lab-corners
      className="lab-select-option"
      value={(value ?? String(children)) || EMPTY}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <Check size={18} aria-hidden="true" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}
