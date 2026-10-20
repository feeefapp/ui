'use client'

import * as React from 'react'
import './raw-input.css'

export type LabInputElement = HTMLInputElement | HTMLTextAreaElement
export type LabInputValidator = (value: string) => string | null | undefined

type CommonProps = {
  /** Synchronous domain validation; return an actionable error or nothing. */
  error?: string | null
  validator?: LabInputValidator
  validationMode?: 'blur' | 'change' | 'submit'
  onValidationChange?: (error: string | null) => void
  /** Bespoke editors can retain their own measured sizing. */
  autoResize?: boolean
  onValueChange?: (value: string) => void
}
type SingleLineProps = React.InputHTMLAttributes<HTMLInputElement> & {
  multiline?: false
  minLines?: never
  maxLines?: never
}
type MultilineProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  multiline: true
  minLines?: number
  maxLines?: number
  type?: never
}
export type LabRawInputProps = CommonProps & (SingleLineProps | MultilineProps)

/** Unpainted editing primitive. Native selection, IME, autofill and form semantics stay intact. */
export const LabRawInput = React.forwardRef<LabInputElement, LabRawInputProps>(
  (
    {
      multiline = false,
      autoResize = true,
      minLines = 1,
      maxLines,
      validator,
      error,
      validationMode = 'blur',
      onValidationChange,
      onValueChange,
      onChange,
      onBlur,
      onInvalid,
      style,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const node = React.useRef<LabInputElement | null>(null)
    const touched = React.useRef(false)
    const resize = React.useCallback(() => {
      const el = node.current
      if (!el || !multiline || !autoResize) return
      const textarea = el as HTMLTextAreaElement
      const computed = getComputedStyle(textarea)
      const line = Number.parseFloat(computed.lineHeight) || 24
      const padding =
        Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom)
      const border =
        Number.parseFloat(computed.borderTopWidth) + Number.parseFloat(computed.borderBottomWidth)
      const minimum = Math.max(1, minLines)
      const maximum = maxLines == null ? Infinity : Math.max(minimum, maxLines)
      textarea.style.height = '0px'
      const height = Math.max(
        line * minimum + padding,
        Math.min(textarea.scrollHeight, line * maximum + padding)
      )
      textarea.style.height = `${height + border}px`
      textarea.style.overflowY = textarea.scrollHeight > height ? 'auto' : 'hidden'
    }, [multiline, minLines, maxLines, autoResize])
    const validate = React.useCallback(
      (el: LabInputElement, reveal: boolean) => {
        el.setCustomValidity(error || validator?.(el.value) || '')
        if (reveal) onValidationChange?.(el.validity.valid ? null : el.validationMessage)
      },
      [validator, error, onValidationChange]
    )
    React.useLayoutEffect(() => {
      const el = node.current
      if (el) validate(el, touched.current && validationMode !== 'submit')
      resize()
    }, [props.value, validate, resize, validationMode])
    React.useEffect(() => {
      const el = node.current
      const form = el?.form
      const reset = () => {
        touched.current = false
        onValidationChange?.(null)
        requestAnimationFrame(() => {
          if (el) {
            validate(el, false)
            onValueChange?.(el.value)
          }
          resize()
        })
      }
      form?.addEventListener('reset', reset)
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
      if (el) observer?.observe(el)
      return () => {
        form?.removeEventListener('reset', reset)
        observer?.disconnect()
      }
    }, [resize, validate, onValidationChange, onValueChange])
    const shared = {
      ...props,
      className: ['lab-raw-editor', className].filter(Boolean).join(' '),
      ref: (el: LabInputElement | null) => {
        node.current = el
        if (typeof forwardedRef === 'function') forwardedRef(el)
        else if (forwardedRef) forwardedRef.current = el
      },
      style: { ...style, ...(multiline ? { resize: 'none' as const } : {}) },
      onChange: (event: React.ChangeEvent<LabInputElement>) => {
        validate(
          event.currentTarget,
          validationMode === 'change' || (touched.current && validationMode === 'blur')
        )
        resize()
        onValueChange?.(event.currentTarget.value)
        ;(onChange as React.ChangeEventHandler<LabInputElement> | undefined)?.(event)
      },
      onBlur: (event: React.FocusEvent<LabInputElement>) => {
        touched.current = true
        validate(event.currentTarget, validationMode !== 'submit')
        ;(onBlur as React.FocusEventHandler<LabInputElement> | undefined)?.(event)
      },
      onInvalid: (event: React.InvalidEvent<LabInputElement>) => {
        touched.current = true
        onValidationChange?.(event.currentTarget.validationMessage)
        ;(onInvalid as React.FormEventHandler<LabInputElement> | undefined)?.(event)
      },
    }
    return multiline ? (
      <textarea
        {...(shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        rows={Math.max(1, minLines)}
      />
    ) : (
      <input {...(shared as React.InputHTMLAttributes<HTMLInputElement>)} />
    )
  }
)
LabRawInput.displayName = 'LabRawInput'
