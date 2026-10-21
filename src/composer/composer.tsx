'use client'

import * as React from 'react'
import { cn } from '../utils'
import { LabRawInput } from '../primitives/raw-input'
import { useComposerLayout } from './use-composer-layout'
import './composer.css'

export { useComposerLayout } from './use-composer-layout'

/** Shared Chat/Image card. Domain-specific controls remain in named layout slots. */
export const LabComposerCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  expanded?: boolean
  layoutRef?: React.Ref<HTMLDivElement>
  layoutClassName?: string
  above?: React.ReactNode
}>(function LabComposerCard({ expanded, layoutRef, layoutClassName, above, children, className, ...props }, ref) {
  return <div {...props} ref={ref} className={cn('lab-pc-card lab-light-edge', className)} data-expanded={expanded}>
    {above}
    <div ref={layoutRef} className={cn('lab-pc-layout', layoutClassName)}>{children}</div>
  </div>
})

export function LabComposerHint({ text }: { text: string }) {
  return <span className="lab-pc-hint" aria-hidden="true" key={text}>{text.split(/(\s+)/).map((word, index) => /\s+/.test(word) ? word : <span key={index} style={{ animationDelay: `${Math.min(index, 40) * 28}ms` }}>{word}</span>)}</span>
}

export type LabPromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  label: string
  placeholder?: string
  disabled?: boolean
  busy?: boolean
  submitDisabled?: boolean
  maxLength?: number
  /** Files, references, mask controls or a contextual note above the input card. */
  above?: React.ReactNode
  /** Attach, record, model and task controls. Their behavior stays with the host. */
  tools?: React.ReactNode
  /** Host-supplied shared submit/stop/compare controls, with their own permissions. */
  submit: React.ReactNode
  footer?: React.ReactNode
  contentRevision?: unknown
}

/** Canonical measured Lab composer with stable caret, growing input and responsive tool slots. */
export function LabPromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, submitDisabled, maxLength, above, tools, submit, footer, contentRevision, className, ...props }: LabPromptComposerProps) {
  const { card, layout, field, expanded } = useComposerLayout(value, contentRevision)
  const canSubmit = !disabled && !busy && !submitDisabled && !!value.trim()
  return <form {...props} className={cn('lab-pc lab-prompt-composer', className)} aria-busy={busy || undefined} onSubmit={event => { event.preventDefault(); if (canSubmit) onSubmit() }}>
    {above}
    <LabComposerCard ref={card} layoutRef={layout} layoutClassName="lab-prompt-composer-layout" expanded={expanded}>
      <div className="lab-pc-field">
        {!value && placeholder && <LabComposerHint text={placeholder} />}
        <LabRawInput multiline autoResize={false} ref={field} className="lab-textarea" dir="auto" rows={1} value={value} maxLength={maxLength} aria-label={label} disabled={disabled} readOnly={busy} onValueChange={onValueChange} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSubmit) onSubmit() }
        }} />
      </div>
      <span className="lab-pc-slot lab-prompt-composer-tools">{tools}</span>
      <span className="lab-pc-slot lab-pc-slot--send">{submit}</span>
    </LabComposerCard>
    {footer}
  </form>
}
