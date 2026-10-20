'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, Clock, ChevronDown, X } from 'lucide-react'
import { LabFieldShell, type LabFieldDecorationProps } from './field-shell'
import { LabButton, LabIconButton } from './button'
import { LabRawInput } from './raw-input'
import { LabModal } from './modal'
import { LabPopoverSurface } from './popover-surface'
import { LabScrollArea } from '../scroll'
import { LabDock } from '../dock'
import { LabTemporalFilterEditor } from '../filters/temporal-editor'
import {
  isTemporalRange,
  normalizeTemporal,
  validateTemporal,
  type LabTemporalConfig,
  type LabTemporalValue,
} from '../filters/temporal'
import { formatTemporalValue } from '../filters/temporal-format'
import { cn } from '../utils'
import './temporal-field.css'

export type LabTemporalFieldProps = LabFieldDecorationProps &
  LabTemporalConfig & {
    'value': LabTemporalValue
    'onValueChange': (value: LabTemporalValue) => void
    'id'?: string
    'name'?: string
    /** Optional independent range form entries, in addition to name's JSON value. */
    'rangeNames'?: { from: string; to: string }
    'disabled'?: boolean
    'readOnly'?: boolean
    'required'?: boolean
    'requiredMessage'?: string
    'placeholder'?: string
    'clearable'?: boolean
    'validator'?: (value: LabTemporalValue) => string | null | undefined
    'validationMode'?: 'blur' | 'change' | 'submit'
    'onValidationChange'?: (error: string | null) => void
    'onBlur'?: React.FocusEventHandler<HTMLButtonElement>
    'locale'?: string
    'formatValue'?: (value: LabTemporalValue) => string
    'className'?: string
    'aria-label'?: string
    'aria-describedby'?: string
  }
/** Full-surface field trigger + shared selection-first editor. Drafts commit only on Apply. */
export const LabTemporalField = React.forwardRef<HTMLButtonElement, LabTemporalFieldProps>(
  function LabTemporalField(
    {
      type,
      value,
      onValueChange,
      min,
      max,
      step,
      allowOvernight,
      presets,
      hint,
      label,
      labelStyle = 'outlined',
      leadingIcon,
      leading,
      trailing,
      supportingText,
      error,
      containerClassName,
      variant = 'outlined',
      controlSize = 'regular',
      dir,
      id,
      name,
      rangeNames,
      disabled,
      readOnly,
      required,
      requiredMessage = 'Choose a value.',
      placeholder,
      clearable = false,
      validator,
      validationMode = 'blur',
      onValidationChange,
      onBlur,
      locale,
      formatValue,
      className,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescription,
    },
    forwardedRef
  ) {
    const trigger = React.useRef<HTMLButtonElement>(null)
    React.useImperativeHandle(forwardedRef, () => trigger.current!, [])
    const formId = React.useId(),
      range = isTemporalRange(type)
    const config: LabTemporalConfig = { type, min, max, step, allowOvernight, presets }
    const [open, setOpen] = React.useState(false),
      [draft, setDraft] = React.useState<LabTemporalValue>(value),
      [draftError, setDraftError] = React.useState<string | null>(null)
    const [message, setMessage] = React.useState<string | null>(null)
    const touched = React.useRef(false),
      editing = React.useRef(false)
    const [container, setContainer] = React.useState<HTMLElement>()
    const [direction, setDirection] = React.useState<'rtl' | 'ltr'>(dir === 'rtl' ? 'rtl' : 'ltr')
    const valueKey = JSON.stringify(value)
    const validate = React.useCallback(
      (next: LabTemporalValue) => {
        if (readOnly) return null
        const normalized = normalizeTemporal(next)
        return (
          (required && normalized == null
            ? requiredMessage
            : validateTemporal({ type, min, max, step, allowOvernight }, normalized) ||
              validator?.(normalized)) || null
        )
      },
      [required, requiredMessage, type, min, max, step, allowOvernight, validator, readOnly]
    )
    const publish = React.useCallback(
      (next: string | null) => {
        setMessage(next)
        onValidationChange?.(next)
      },
      [onValidationChange]
    )
    React.useEffect(() => {
      if (touched.current && validationMode !== 'submit') publish(validate(value))
    }, [valueKey, value, validationMode, publish, validate])
    React.useEffect(() => {
      const form = trigger.current?.form
      const reset = () => {
        touched.current = false
        publish(null)
        setOpen(false)
        editing.current = false
      }
      form?.addEventListener('reset', reset)
      return () => form?.removeEventListener('reset', reset)
    }, [publish])
    const close = () => {
      editing.current = false
      setOpen(false)
      touched.current = true
      if (validationMode !== 'submit') publish(validate(value))
    }
    const begin = () => {
      if (disabled || readOnly) return
      setContainer(trigger.current?.closest('dialog') || undefined)
      setDirection(getComputedStyle(trigger.current!).direction === 'rtl' ? 'rtl' : 'ltr')
      setDraft(value)
      setDraftError(null)
      editing.current = true
      setOpen(true)
    }
    React.useEffect(() => {
      if (disabled || readOnly) {
        editing.current = false
        setOpen(false)
      }
    }, [disabled, readOnly])
    const commit = (next: LabTemporalValue) => {
      const normalized = normalizeTemporal(next)
      onValueChange(normalized)
      touched.current = true
      if (validationMode !== 'submit') publish(validate(normalized))
      editing.current = false
      setOpen(false)
    }
    const apply = (event: React.FormEvent) => {
      event.preventDefault()
      const normalized = normalizeTemporal(draft),
        failure = validate(normalized)
      if (failure) {
        setDraftError(failure)
        return
      }
      commit(normalized)
    }
    const formatted = (
      formatValue || ((next: LabTemporalValue) => formatTemporalValue(type, next, locale))
    )(value)
    const populated = normalizeTemporal(value) != null
    const floatingHint = hint ?? label
    const title = floatingHint || ariaLabel || 'Choose date and time'
    const actions = (
      <LabDock label={`${title} actions`}>
        <LabButton
          variant="text"
          controlSize="compact"
          onClick={() => {
            setDraft(null)
            setDraftError(null)
          }}
        >
          Clear
        </LabButton>
        <LabButton variant="filled" controlSize="compact" type="submit" form={formId}>
          Apply
        </LabButton>
      </LabDock>
    )
    const editor = (
      <form id={formId} className="lab-temporal-field-editor" onSubmit={apply}>
        <LabTemporalFilterEditor
          key={`${type}-${open}`}
          config={config}
          value={draft}
          onChange={(next) => {
            setDraft(next)
            setDraftError(null)
          }}
        />
        {draftError && (
          <p role="alert" className="lab-filter-error">
            {draftError}
          </p>
        )}
      </form>
    )
    return (
      <Popover.Root open={open && !range} onOpenChange={(next) => (next ? begin() : close())}>
        <LabFieldShell
          id={id}
          hint={hint}
          label={label}
          labelStyle={labelStyle}
          leadingIcon={
            leadingIcon === undefined ? (
              type.startsWith('time') ? (
                <Clock />
              ) : (
                <CalendarDays />
              )
            ) : (
              leadingIcon
            )
          }
          leading={leading}
          trailing={
            <>
              {trailing}
              {clearable && populated && !disabled && !readOnly && (
                <LabIconButton
                  variant="text"
                  controlSize="compact"
                  className="lab-temporal-field-clear"
                  aria-label={`Clear ${title}`}
                  onClick={() => {
                    trigger.current?.focus()
                    commit(null)
                  }}
                >
                  <X size={16} />
                </LabIconButton>
              )}
              <ChevronDown size={18} aria-hidden="true" />
            </>
          }
          supportingText={supportingText}
          error={error ?? message}
          containerClassName={containerClassName}
          variant={variant}
          controlSize={controlSize}
          dir={dir}
          disabled={disabled}
          required={required}
          populated={populated}
          alwaysFloat={open}
          describedBy={ariaDescription}
        >
          {({ id: fieldId, describedBy, invalid }) => {
            const button = (
              <LabButton
                ref={trigger}
                id={fieldId}
                variant={variant}
                controlSize={controlSize}
                className={cn('lab-field-select-control lab-temporal-field-control', className)}
                disabled={disabled}
                aria-label={ariaLabel || floatingHint || placeholder || title}
                aria-describedby={
                  [describedBy, populated ? `${fieldId}-value` : null].filter(Boolean).join(' ') ||
                  undefined
                }
                aria-invalid={invalid}
                aria-required={required || undefined}
                aria-readonly={readOnly || undefined}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={range ? begin : undefined}
                onKeyDown={(event) => {
                  if (!range && readOnly && ['Enter', ' ', 'ArrowDown'].includes(event.key))
                    event.preventDefault()
                  if (!readOnly && ['ArrowDown'].includes(event.key)) {
                    event.preventDefault()
                    begin()
                  }
                }}
                onBlur={(event) => {
                  if (!editing.current) {
                    touched.current = true
                    if (validationMode !== 'submit') publish(validate(value))
                  }
                  onBlur?.(event)
                }}
              >
                <span id={`${fieldId}-value`} className="lab-temporal-field-value">
                  {formatted || (!floatingHint ? placeholder : '') || '\u00a0'}
                </span>
              </LabButton>
            )
            return range || readOnly ? button : <Popover.Trigger asChild>{button}</Popover.Trigger>
          }}
        </LabFieldShell>
        <LabRawInput
          className="lab-sr-only"
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          disabled={disabled}
          onChange={() => {}}
          value={populated ? (typeof value === 'string' ? value : JSON.stringify(value)) : ''}
          required={required && !readOnly}
          validator={() => validate(value)}
          validationMode="submit"
          onValidationChange={publish}
          onInvalid={(event) => {
            event.preventDefault()
            touched.current = true
            publish(validate(value))
            trigger.current?.focus()
          }}
        />
        {range && rangeNames && (
          <>
            <LabRawInput
              type="hidden"
              name={rangeNames.from}
              disabled={disabled}
              value={value && typeof value === 'object' ? value.from : ''}
            />
            <LabRawInput
              type="hidden"
              name={rangeNames.to}
              disabled={disabled}
              value={value && typeof value === 'object' ? value.to : ''}
            />
          </>
        )}
        <Popover.Portal container={container}>
          <LabPopoverSurface asChild>
            <Popover.Content
              className="lab-temporal-field-popover"
              aria-label={title}
              dir={direction}
              align="start"
              sideOffset={8}
              collisionPadding={12}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                trigger.current?.focus({ preventScroll: true })
              }}
            >
              <LabScrollArea label={`${title} picker`} contentPadding={12} bottom={actions}>
                {editor}
              </LabScrollArea>
            </Popover.Content>
          </LabPopoverSurface>
        </Popover.Portal>
        {typeof document !== 'undefined' &&
          createPortal(
            <LabModal
              open={open && range}
              label={title}
              close={close}
              returnFocusRef={trigger}
              scrollable
              fitContent
              className={`lab-temporal-field-dialog ${type.startsWith('time') ? '' : 'lab-filter-calendar-dialog'}`}
              bottom={actions}
            >
              <div dir={direction}>{editor}</div>
            </LabModal>,
            container ?? document.body
          )}
      </Popover.Root>
    )
  }
)

export type LabTemporalSingleFieldProps = Omit<
  LabTemporalFieldProps,
  'type' | 'value' | 'onValueChange'
> & {
  value: string | null
  onValueChange: (value: string | null) => void
}
export type LabTemporalRangeFieldProps = Omit<
  LabTemporalFieldProps,
  'type' | 'value' | 'onValueChange'
> & {
  value: { from: string; to: string } | null
  onValueChange: (value: { from: string; to: string } | null) => void
}
function singleField(type: 'date' | 'time' | 'datetime') {
  return React.forwardRef<HTMLButtonElement, LabTemporalSingleFieldProps>((props, ref) => (
    <LabTemporalField
      {...props}
      ref={ref}
      type={type}
      onValueChange={(next) => props.onValueChange(typeof next === 'string' ? next : null)}
    />
  ))
}
function rangeField(type: 'dateRange' | 'timeRange' | 'datetimeRange') {
  return React.forwardRef<HTMLButtonElement, LabTemporalRangeFieldProps>((props, ref) => (
    <LabTemporalField
      {...props}
      ref={ref}
      type={type}
      onValueChange={(next) => props.onValueChange(next && typeof next === 'object' ? next : null)}
    />
  ))
}
export const LabDateField = singleField('date')
export const LabTimeField = singleField('time')
export const LabDateTimeField = singleField('datetime')
export const LabDateRangeField = rangeField('dateRange')
export const LabTimeRangeField = rangeField('timeRange')
export const LabDateTimeRangeField = rangeField('datetimeRange')
