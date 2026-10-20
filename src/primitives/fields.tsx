import * as React from 'react'
import { cn } from '../utils'
import { LabCheckbox, LabRadio } from './choice'

export const LabInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) =>
  type === 'checkbox' ? (
    <LabCheckbox ref={ref} className={className} {...props} />
  ) : type === 'radio' ? (
    <LabRadio ref={ref} className={className} {...props} />
  ) : (
    <input ref={ref} type={type} className={cn('lab-input', className)} {...props} />
  )
)

LabInput.displayName = 'LabInput'

export const LabTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('lab-textarea', className)} {...props} />
))

LabTextarea.displayName = 'LabTextarea'

export const LabLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('lab-label', className)} {...props} />
))
LabLabel.displayName = 'LabLabel'

export const LabImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>((props, ref) => <img {...props} ref={ref} />)

LabImage.displayName = 'LabImage'
