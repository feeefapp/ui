'use client'

import * as React from 'react'
import { cn } from '../utils'
import { RawInput } from '../primitives/raw-input'
import { useComposerLayout } from './use-composer-layout'
import { GlassScope } from '../glass/container'
import { useGlassMember } from '../glass/member'
import './composer.css'

export { useComposerLayout } from './use-composer-layout'

/**
 * Shared Chat/Image card. Domain-specific controls remain in named layout slots. Its glass is
 * painted by a glass container (its own, or the row it sits in), so it shares light, press and tint.
 */
export const ComposerCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  /** Two-row layout (field above, tools below) instead of one line. Sets `data-expanded`. */
  expanded?: boolean
  /** Ref to the inner layout grid, for `useComposerLayout`. */
  layoutRef?: React.Ref<HTMLDivElement>
  /** Class for the inner layout grid. */
  layoutClassName?: string
  /** Content inside the card, above the layout grid. */
  above?: React.ReactNode
}>(function ComposerCard({ expanded, layoutRef, layoutClassName, above, children, className, ...props }, ref) {
  return <GlassScope className="lab-pc-glass">
    <GlassCard {...props} ref={ref} className={cn('lab-pc-card lab-light-edge', className)} data-expanded={expanded}>
      {above}
      <div ref={layoutRef} className={cn('lab-pc-layout', layoutClassName)}>{children}</div>
    </GlassCard>
  </GlassScope>
})

/** The card element, registered with the glass container; it animates its own height. */
const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function GlassCard(props, ref) {
  const element = React.useRef<HTMLDivElement | null>(null)
  const member = useGlassMember(element, undefined, { motion: 'follow' })
  return <div {...props} ref={(node) => {
    element.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }} data-glass-member={member ? '' : undefined}/>
})

/**
 * Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately.
 * Its words are inline blocks, so it takes the direction of its own text (`dir="auto"`): an English
 * hint on an Arabic page keeps its word order, still aligned to the page's start.
 */
export function ComposerHint({ text }: {
  /** The hint text. Changing it replays the animation. */
  text: string
}) {
  return <span className="lab-pc-hint" aria-hidden="true" dir="auto" key={text}>{text.split(/(\s+)/).map((word, index) => /\s+/.test(word) ? word : <span key={index} style={{ animationDelay: `${Math.min(index, 40) * 28}ms` }}>{word}</span>)}</span>
}

export type PromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
  /** The prompt text (controlled). */
  value: string
  /** Called with the new text on every edit. */
  onValueChange: (value: string) => void
  /** Called on Enter or form submit, only when the prompt is not blank and submitting is allowed. */
  onSubmit: () => void
  /** Accessible name of the text field. */
  label: string
  /** Animated hint shown while the field is empty. */
  placeholder?: string
  /** Disables the field and blocks submitting. */
  disabled?: boolean
  /** Request in flight: the field turns read-only, the form sets `aria-busy` and submitting is blocked. */
  busy?: boolean
  /** Highlight the card only while a compatible file is dragged over the drop target. */
  dropActive?: boolean
  /** Blocks submitting without disabling the field. */
  submitDisabled?: boolean
  /** Maximum prompt length in characters. */
  maxLength?: number
  /** Files, references, mask controls or a contextual note above the input card. */
  above?: React.ReactNode
  /** Attach, record, model and task controls. Their behavior stays with the host. */
  tools?: React.ReactNode
  /** Host-supplied shared submit/stop/compare controls, with their own permissions. */
  submit: React.ReactNode
  /** Content below the card, such as a caption or allowance note. */
  footer?: React.ReactNode
  /** Change it when slot content changes size, so the layout re-measures. */
  contentRevision?: unknown
}

/** Canonical measured Lab composer with stable caret, growing input and responsive tool slots. */
export function PromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, dropActive, submitDisabled, maxLength, above, tools, submit, footer, contentRevision, className, ...props }: PromptComposerProps) {
  const { card, layout, field, expanded } = useComposerLayout(value, contentRevision)
  const canSubmit = !disabled && !busy && !submitDisabled && !!value.trim()
  return <form {...props} className={cn('lab-pc lab-prompt-composer', className)} aria-busy={busy || undefined} onSubmit={event => { event.preventDefault(); if (canSubmit) onSubmit() }}>
    {above}
    <ComposerCard data-dragging={dropActive || undefined} ref={card} layoutRef={layout} layoutClassName="lab-prompt-composer-layout" expanded={expanded}>
      <div className="lab-pc-field">
        {!value && placeholder && <ComposerHint text={placeholder} />}
        <RawInput multiline autoResize={false} ref={field} className="lab-textarea" dir="auto" rows={1} value={value} maxLength={maxLength} aria-label={label} disabled={disabled} readOnly={busy} onValueChange={onValueChange} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSubmit) onSubmit() }
        }} />
      </div>
      <span className="lab-pc-slot lab-prompt-composer-tools">{tools}</span>
      <span className="lab-pc-slot lab-pc-slot--send">{submit}</span>
    </ComposerCard>
    {footer}
  </form>
}
