'use client'

import * as React from 'react'
import './raw-input.css'

export type InputElement = HTMLInputElement | HTMLTextAreaElement
export type InputValidator = (value: string) => string | null | undefined

type CommonProps = {
  /** An error to show now, such as one from the server. Blocks form submission while set. */
  error?: string | null
  /** Synchronous check run on the value; return an actionable error, or nothing when it is valid. */
  validator?: InputValidator
  /** When errors appear: after the first blur (`blur`), on every change (`change`) or only on submit (`submit`). */
  validationMode?: 'blur' | 'change' | 'submit'
  /** Called with the visible error message, or `null` when it clears. */
  onValidationChange?: (error: string | null) => void
  /** Multiline only: grows the textarea with its content between `minLines` and `maxLines`. Turn off for editors that size themselves. */
  autoResize?: boolean
  /** Called with the new text on every change. */
  onValueChange?: (value: string) => void
}
type SingleLineProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Renders a growing `<textarea>` instead of an `<input>`. */
  multiline?: false
  minLines?: never
  maxLines?: never
}
type MultilineProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Renders a growing `<textarea>` instead of an `<input>`. */
  multiline: true
  /** Multiline only: visible lines when empty. */
  minLines?: number
  /** Multiline only: lines before the textarea scrolls. Unlimited when omitted. */
  maxLines?: number
  type?: never
}
export type RawInputProps = CommonProps & (SingleLineProps | MultilineProps)

/**
 * An unpainted native `<input>` or `<textarea>` with the kit's validation and auto-growing
 * lines. Native selection, IME, autofill and form semantics stay intact. Use it inside bespoke
 * editors that draw their own surface; use `TextField` everywhere else.
 */
export const RawInput = React.forwardRef<InputElement, RawInputProps>(
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
    const node = React.useRef<InputElement | null>(null)
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
      (el: InputElement, reveal: boolean) => {
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
      ref: (el: InputElement | null) => {
        node.current = el
        if (typeof forwardedRef === 'function') forwardedRef(el)
        else if (forwardedRef) forwardedRef.current = el
      },
      style: { ...style, ...(multiline ? { resize: 'none' as const } : {}) },
      onChange: (event: React.ChangeEvent<InputElement>) => {
        validate(
          event.currentTarget,
          validationMode === 'change' || (touched.current && validationMode === 'blur')
        )
        resize()
        onValueChange?.(event.currentTarget.value)
        ;(onChange as React.ChangeEventHandler<InputElement> | undefined)?.(event)
      },
      onBlur: (event: React.FocusEvent<InputElement>) => {
        touched.current = true
        validate(event.currentTarget, validationMode !== 'submit')
        ;(onBlur as React.FocusEventHandler<InputElement> | undefined)?.(event)
      },
      onInvalid: (event: React.InvalidEvent<InputElement>) => {
        touched.current = true
        onValidationChange?.(event.currentTarget.validationMessage)
        ;(onInvalid as React.FormEventHandler<InputElement> | undefined)?.(event)
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
RawInput.displayName = 'RawInput'
