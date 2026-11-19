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

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * The page's largest image above the fold (its LCP): loads eagerly at high fetch priority.
   * Give it to at most one image per page; several "priority" images compete for bandwidth
   * and all arrive later. Every other image loads lazily.
   */
  priority?: boolean
}

/**
 * A plain `<img>` with fast defaults: decoded off the main thread, lazy unless `priority`.
 * Always pass `width` and `height` (or size the box with CSS `aspect-ratio`) so the layout
 * does not shift when the file arrives.
 */
export const Image = React.forwardRef<HTMLImageElement, ImageProps>(({ priority = false, ...props }, ref) => (
  <img
    decoding="async"
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : undefined}
    {...props}
    ref={ref}
  />
))

Image.displayName = 'Image'
