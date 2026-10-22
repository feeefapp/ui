'use client'

import * as React from 'react'
import { cn } from '../utils'
import { LabRawInput, type LabRawInputProps, type LabInputElement } from './raw-input'
import { LabFieldShell, type LabFieldDecorationProps } from './field-shell'

type NullableFieldValue<T extends { value?: unknown }> = T extends unknown
  ? Omit<T, 'value'> & { value?: T['value'] | null }
  : never

export type LabTextFieldProps = NullableFieldValue<LabRawInputProps> &
  LabFieldDecorationProps & {
    /** Shows the character count under the field, with `maxLength` when set. */
    showCounter?: boolean
  }

/**
 * A labelled text input: native `<input>` or growing `<textarea>` inside the field frame, with a
 * floating hint, icons, affixes, supporting text, validation and an optional counter.
 */
export const LabTextField = React.forwardRef<LabInputElement, LabTextFieldProps>(
  (
    {
      label,
      hint,
      controlSize = 'regular',
      variant = 'outlined',
      labelStyle = 'outlined',
      leadingIcon,
      leading,
      trailing,
      supportingText,
      error,
      showCounter = false,
      containerClassName,
      className,
      'id': suppliedId,
      onValidationChange,
      onValueChange,
      'aria-describedby': describedBy,
      ...props
    },
    ref
  ) => {
    const [validationError, setValidationError] = React.useState<string | null>(null)
    const [length, setLength] = React.useState(
      String(props.value ?? props.defaultValue ?? '').length
    )
    const populated = props.value !== undefined ? String(props.value ?? '').length > 0 : length > 0
    const message = error ?? validationError
    const handleValidation = React.useCallback(
      (next: string | null) => {
        setValidationError(next)
        onValidationChange?.(next)
      },
      [onValidationChange]
    )
    return (
      <LabFieldShell
        id={suppliedId}
        label={label}
        hint={hint}
        dir={props.dir}
        variant={variant}
        controlSize={controlSize}
        labelStyle={labelStyle}
        leadingIcon={leadingIcon}
        leading={leading}
        trailing={trailing}
        supportingText={supportingText}
        error={message}
        containerClassName={containerClassName}
        disabled={props.disabled}
        required={props.required}
        describedBy={describedBy}
        invalid={props['aria-invalid'] === true || props['aria-invalid'] === 'true'}
        alwaysFloat={Boolean(
          props.type &&
          !['text', 'email', 'tel', 'url', 'search', 'password', 'number'].includes(props.type)
        )}
        counter={
          showCounter ? (
            <>
              {props.value !== undefined ? String(props.value ?? '').length : length}
              {props.maxLength != null ? ` / ${props.maxLength}` : ''}
            </>
          ) : undefined
        }
      >
        {({ id, describedBy: description, invalid }) => (
          <LabRawInput
            {...props}
            error={error}
            value={props.value === null ? '' : props.value}
            ref={ref}
            id={id}
            className={cn('lab-raw-input', className)}
            dir={props.dir === 'auto' && !populated ? undefined : props.dir}
            placeholder={(hint ?? label) ? ' ' : props.placeholder || ' '}
            aria-invalid={invalid || props['aria-invalid']}
            aria-describedby={description}
            onValidationChange={handleValidation}
            onValueChange={(value) => {
              setLength(value.length)
              onValueChange?.(value)
            }}
          />
        )}
      </LabFieldShell>
    )
  }
)
LabTextField.displayName = 'LabTextField'
