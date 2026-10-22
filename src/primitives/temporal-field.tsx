'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, Clock, ChevronDown, X } from 'lucide-react'
import { LabFieldShell, type LabFieldDecorationProps } from './field-shell'
import { LabButton, LabIconButton } from './button'
import { LabRawInput } from './raw-input'
import { LabPopoverSurface } from './popover-surface'
import { LabTemporalFilterEditor } from '../filters/temporal-editor'
import { LabTemporalDialog } from '../filters/temporal-dialog'
import { LabToolbarGroup } from '../toolbar'
import {
  isTemporalRange,
  normalizeTemporal,
  validateTemporal,
  type LabTemporalConfig,
  type LabTemporalValue,
} from '../filters/temporal'
import { formatTemporalValue } from '../filters/temporal-format'
import { useLabI18n } from '../i18n'
import { cn } from '../utils'
import './temporal-field.css'

/** Phones: every picker opens as a dialog (full width, 44px targets) instead of an anchored popover. */
const COMPACT_QUERY = '(max-width: 599px)'
function useCompactViewport() {
  return React.useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(COMPACT_QUERY)
      media.addEventListener('change', notify)
      return () => media.removeEventListener('change', notify)
    },
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false
  )
}

export type LabTemporalFieldProps = LabFieldDecorationProps &
  LabTemporalConfig & {
    /** Committed value: a local ISO string (`2026-10-21`, `09:30`, `2026-10-21T09:30`), a `{ from, to }` range, or `null`. */
    value: LabTemporalValue
    /** Called with the normalized value on Apply or when the clear button empties the field. */
    onValueChange: (value: LabTemporalValue) => void
    /** Id of the trigger button; generated when omitted. */
    id?: string
    /** Form field name. Single values submit as the ISO string, ranges as `{"from","to"}` JSON. */
    name?: string
    /** Optional independent range form entries, in addition to name's JSON value. */
    rangeNames?: { from: string; to: string }
    /** Disables the trigger and leaves the value out of form submission. */
    disabled?: boolean
    /** Shows the value but never opens the picker; skips validation. */
    readOnly?: boolean
    /** Requires a value; checked on blur, on form submit and on Apply. */
    required?: boolean
    /** Error shown when a required field is empty. */
    requiredMessage?: string
    /** Text shown while empty. Hidden when a `hint` is set; add an `aria-label` when used alone. */
    placeholder?: string
    /** Shows a clear button inside the field while it has a value. */
    clearable?: boolean
    /** Extra synchronous rule after the built-in format, step and bounds checks. Return an error message or nothing. */
    validator?: (value: LabTemporalValue) => string | null | undefined
    /** When errors appear: after the field loses focus (default), on every change, or only on form submit. */
    validationMode?: 'blur' | 'change' | 'submit'
    /** Receives the current error message, or `null` once the value is valid. */
    onValidationChange?: (error: string | null) => void
    /** Blur handler for the trigger button. */
    onBlur?: React.FocusEventHandler<HTMLButtonElement>
    /** BCP 47 locale for the displayed value and the calendar. Defaults to the kit's i18n locale; the stored value stays ISO. */
    locale?: string
    /** Replaces the default display text for the value. Display only. */
    formatValue?: (value: LabTemporalValue) => string
    /** Class name for the trigger button. Use `containerClassName` for the field box. */
    className?: string
    /** Accessible name when there is no visible `hint`. */
    'aria-label'?: string
    /** Extra ids describing the field, added to its supporting text and error. */
    'aria-describedby'?: string
  }
/**
 * A date or time field: a full-surface trigger that opens a selection-first picker with preset
 * chips, calendars, number-field times and optional typed entry. Single values open in a popover
 * (a dialog on phones), ranges in a dialog. A date commits on the day you pick; times, datetimes and
 * ranges commit on Apply.
 */
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
      locale: localeProp,
      formatValue,
      className,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescription,
    },
    forwardedRef
  ) {
    const trigger = React.useRef<HTMLButtonElement>(null)
    React.useImperativeHandle(forwardedRef, () => trigger.current!, [])
    const i18n = useLabI18n()
    const locale = localeProp ?? i18n.locale
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
    const formatted = (formatValue || ((next: LabTemporalValue) => formatTemporalValue(type, next, locale)))(
      value
    )
    const populated = normalizeTemporal(value) != null
    const floatingHint = hint ?? label
    const title = floatingHint || ariaLabel || 'Choose date and time'
    // A date is complete with one tap: pick it and the field closes. Everything else has parts
    // (time, two ends), so it keeps one Apply.
    const instant = type === 'date'
    const compact = useCompactViewport()
    const asDialog = range || compact
    const clear = () => {
      if (instant) commit(null)
      else {
        setDraft(null)
        setDraftError(null)
      }
    }
    const changeDraft = (next: LabTemporalValue) => {
      setDraft(next)
      setDraftError(null)
    }
    const pick = (next: LabTemporalValue) => {
      if (!instant) return
      const failure = validate(normalizeTemporal(next))
      if (failure) setDraftError(failure)
      else commit(next)
    }
    // Popovers end their footer row with one glass group. A date with nothing to clear has no
    // actions at all: the day itself is the action.
    const actions =
      instant && normalizeTemporal(draft) == null ? null : (
        <LabToolbarGroup label={`${title} actions`} className="lab-temporal-actions">
          <LabButton
            variant="text"
            appearance="toolbar"
            controlSize="compact"
            disabled={normalizeTemporal(draft) == null}
            onClick={clear}
          >
            Clear
          </LabButton>
          {!instant && (
            <LabButton variant="filled" appearance="toolbar" controlSize="compact" type="submit" form={formId}>
              Apply
            </LabButton>
          )}
        </LabToolbarGroup>
      )
    const popoverEditor = (
      <form id={formId} className="lab-temporal-field-editor" onSubmit={apply}>
        <LabTemporalFilterEditor
          config={config}
          locale={locale}
          value={draft}
          resetKey={open}
          onChange={changeDraft}
          footer={actions}
          onPick={pick}
        />
        {draftError && (
          <p role="alert" className="lab-filter-error">
            {draftError}
          </p>
        )}
      </form>
    )
    return (
      <Popover.Root open={open && !asDialog} onOpenChange={(next) => (next ? begin() : close())}>
        <LabFieldShell
          id={id}
          hint={hint}
          label={label}
          labelStyle={labelStyle}
          leadingIcon={
            leadingIcon === undefined ? type.startsWith('time') ? <Clock /> : <CalendarDays /> : leadingIcon
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
                  [describedBy, populated ? `${fieldId}-value` : null].filter(Boolean).join(' ') || undefined
                }
                aria-invalid={invalid}
                aria-required={required || undefined}
                aria-readonly={readOnly || undefined}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={asDialog ? begin : undefined}
                onKeyDown={(event) => {
                  if (!asDialog && readOnly && ['Enter', ' ', 'ArrowDown'].includes(event.key))
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
            return asDialog || readOnly ? button : <Popover.Trigger asChild>{button}</Popover.Trigger>
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
              {/* Hugs its content; the actions sit at the end of the editor's footer row. */}
              {!asDialog && popoverEditor}
            </Popover.Content>
          </LabPopoverSurface>
        </Popover.Portal>
        {typeof document !== 'undefined' &&
          createPortal(
            <LabTemporalDialog
              open={open && asDialog}
              label={title}
              close={close}
              returnFocusRef={trigger}
              dir={direction}
              className="lab-temporal-field-dialog"
              formId={formId}
              onSubmit={apply}
              config={config}
              locale={locale}
              value={draft}
              onChange={changeDraft}
              onPick={pick}
              onClear={clear}
              clearDisabled={normalizeTemporal(draft) == null}
              showApply={!instant}
              error={draftError}
            />,
            container ?? document.body
          )}
      </Popover.Root>
    )
  }
)

export type LabTemporalSingleFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
  /** Committed local ISO string, or `null` when empty. */
  value: string | null
  /** Called with the applied string, or `null` when cleared. */
  onValueChange: (value: string | null) => void
}
export type LabTemporalRangeFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
  /** Committed range of local ISO strings; either end may be `''` (open), or the whole value `null`. */
  value: { from: string; to: string } | null
  /** Called with the applied range, or `null` when cleared. */
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
/** A calendar day, stored as `YYYY-MM-DD`. */
export const LabDateField = singleField('date')
/** A time of day, stored as `HH:mm` (or `HH:mm:ss` when `step` is under 60 seconds). */
export const LabTimeField = singleField('time')
/** A local date and time, stored as `YYYY-MM-DDTHH:mm`. */
export const LabDateTimeField = singleField('datetime')
/** A range of calendar days, stored as `{ from, to }` dates. */
export const LabDateRangeField = rangeField('dateRange')
/** A range of times of day; `allowOvernight` lets the end come before the start. */
export const LabTimeRangeField = rangeField('timeRange')
/** A range of local dates and times. */
export const LabDateTimeRangeField = rangeField('datetimeRange')
