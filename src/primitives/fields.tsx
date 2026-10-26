import * as React from 'react'
import { cn } from '../utils'
import { Checkbox, Radio } from './choice'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) =>
  type === 'checkbox' ? (
    <Checkbox ref={ref} className={className} {...props} />
  ) : type === 'radio' ? (
    <Radio ref={ref} className={className} {...props} />
  ) : (
    <input ref={ref} type={type} className={cn('lab-input', className)} {...props} />
  )
)

Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('lab-textarea', className)} {...props} />
))

Textarea.displayName = 'Textarea'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('lab-label', className)} {...props} />
))
Label.displayName = 'Label'

export const Image = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>((props, ref) => <img {...props} ref={ref} />)

Image.displayName = 'Image'
