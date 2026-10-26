'use client'

import * as React from 'react'
import { ArrowUp, X } from 'lucide-react'
import { cn } from '../utils'
import { RawInput } from '../primitives/raw-input'
import { IconButton } from '../primitives/button'
import { PixelLoader } from '../pixel-art'
import { GlassGroup } from '../scaffold'
import { GlassBar, GlassScope } from '../glass/container'
import { LayoutGroup } from '../physics/layout-group'
import { scrollEdgeOpacities } from '../scroll/metrics'
import { useI18n } from '../i18n'
import { composerExpanded, composerSendState } from './composer-model'
import { useComposerMotion } from './use-composer-motion'
import './composer.css'

export { composerExpanded, composerSendState } from './composer-model'
export type { ComposerSendState } from './composer-model'

/** Controls whose menu, popover or panel is open keep the second row in place (`pinned`). */
const PINNED = '[data-state="open"], [aria-expanded="true"], [aria-pressed="true"]'

const coarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

/**
 * Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately.
 * Its words are inline blocks, so it takes the direction of its own text (`dir="auto"`): an English
 * hint on an Arabic page keeps its word order, still aligned to the page's start.
 */
export function ComposerHint({ text }: {
  /** The hint text. Changing it replays the animation. */
  text: string
}) {
  return (
    <span className="lab-composer-hint" aria-hidden="true" dir="auto" key={text}>
      {text.split(/(\s+)/).map((word, index) =>
        /\s+/.test(word) ? word : <span key={index} style={{ animationDelay: `${Math.min(index, 40) * 28}ms` }}>{word}</span>
      )}
    </span>
  )
}

export type ComposerFieldProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'onSubmit' | 'rows' | 'placeholder'
> & {
  /** The text (controlled). */
  value: string
  /** Called with the new text on every edit. */
  onValueChange(value: string): void
  /** Accessible name of the field. */
  label: string
  /** Animated hint shown while the field is empty. */
  placeholder?: string
  /** Called on Enter (not Shift+Enter, not while an input method composes, not on touch keyboards). The owner decides whether it sends. */
  onSubmit?(): void
  /** Lines the field grows to before it scrolls. Default 6. */
  maxLines?: number
}

/**
 * The composer's text field: an unpainted multiline input in the control font that grows from one
 * line to `maxLines`, then scrolls, with the animated `ComposerHint` while empty. Enter calls
 * `onSubmit`; Shift+Enter breaks the line (on touch keyboards Return always breaks it). Place it in `ComposerBar`'s `field` slot.
 */
export const ComposerField = React.forwardRef<HTMLTextAreaElement, ComposerFieldProps>(function ComposerField(
  { value, onValueChange, label, placeholder, onSubmit, maxLines = 6, onKeyDown, className, ...props },
  ref
) {
  return (
    <div className="lab-composer-field">
      {!value && placeholder && <ComposerHint text={placeholder} />}
      <RawInput
        {...props}
        ref={ref as React.Ref<HTMLTextAreaElement & HTMLInputElement>}
        multiline
        minLines={1}
        maxLines={maxLines}
        className={cn('lab-composer-input', className)}
        dir="auto"
        rows={1}
        value={value}
        aria-label={label}
        onValueChange={onValueChange}
        onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            // Touch keyboards have no Shift+Enter: Return adds a line there and send sends.
            if (coarsePointer()) return
            event.preventDefault()
            onSubmit?.()
          }
        }}
      />
    </div>
  )
})

/**
 * The send button inside the capsule, at its trailing end: a quiet neutral circle while there is
 * nothing to send, the primary circle with an up arrow when there is, the kit's loader while
 * sending. With `onStop` the sending button stays enabled and stops the request.
 */
export function ComposerSend({ label, ready, submitting = false, onSend, onStop, stopLabel, type = 'button' }: {
  /** Accessible name, such as "Send message" or "Create image". */
  label: string
  /** There is something to send and sending is allowed. */
  ready: boolean
  /** A request is in flight: shows the loader. */
  submitting?: boolean
  /** Called on click while ready. */
  onSend?(): void
  /** Makes the sending button a stop button. */
  onStop?(): void
  /** Accessible name while it stops. Defaults to the localized "Stop". */
  stopLabel?: string
  /** `submit` to send through the enclosing form. */
  type?: 'button' | 'submit'
}) {
  const { t } = useI18n()
  const state = composerSendState({ ready, submitting, stoppable: !!onStop })
  return (
    <span className="lab-composer-send" data-state={state}>
      {state === 'stop' ? (
        <IconButton
          variant="filled"
          controlSize="small"
          aria-label={stopLabel ?? t('lab.composer.stop')}
          aria-busy
          onClick={onStop}
        >
          <PixelLoader size={16} decorative />
        </IconButton>
      ) : (
        <IconButton
          type={state === 'ready' ? type : 'button'}
          variant={state === 'idle' ? 'ghost' : 'filled'}
          controlSize="small"
          aria-label={label}
          title={label}
          disabled={state === 'idle'}
          loading={state === 'sending'}
          onClick={state === 'ready' && type === 'button' ? onSend : undefined}
        >
          <ArrowUp aria-hidden="true" />
        </IconButton>
      )}
    </span>
  )
}

/**
 * Attachments inside the capsule, above the text (like iOS Messages): one row of
 * `ComposerAttachment` tiles that scrolls sideways with edge fades when it overflows, and, with
 * `max`, a quiet count of how many more fit.
 */
export function ComposerAttachments({ label, count, max, children }: {
  /** Accessible name of the list, such as "Reference images". */
  label: string
  /** How many are attached; shown with `max`. */
  count?: number
  /** How many fit. Shows "2 of 4" at the trailing end. */
  max?: number
  /** `ComposerAttachment` tiles. */
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const scroller = React.useRef<HTMLDivElement>(null)
  const ids = React.Children.toArray(children)
    .map((child) => (React.isValidElement(child) ? String(child.key) : ''))
    .join('|')
  React.useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const fade = () => {
      const max = el.scrollWidth - el.clientWidth
      const rtl = getComputedStyle(el).direction === 'rtl'
      // Right-to-left scrollers run from -max (far left) to 0.
      const left = rtl ? max + el.scrollLeft : el.scrollLeft
      const edges = scrollEdgeOpacities(left, max, 24)
      el.style.setProperty('--lab-composer-fade-left', String(max > 1 ? edges.top : 0))
      el.style.setProperty('--lab-composer-fade-right', String(max > 1 ? edges.bottom : 0))
    }
    fade()
    el.addEventListener('scroll', fade, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fade)
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', fade)
      observer?.disconnect()
    }
  }, [ids])
  return (
    <div className="lab-composer-attachments">
      <LayoutGroup layoutKey={ids}>
        <div ref={scroller} className="lab-composer-attachments-scroll" role="list" aria-label={label}>
          {children}
        </div>
      </LayoutGroup>
      {max != null && count != null && count > 0 && (
        <span className="lab-composer-attachments-count">{t('lab.composer.attachmentCount', { count, max })}</span>
      )}
    </div>
  )
}

/**
 * One attachment tile: a rounded-square thumbnail (or, with `title`, a wider tile with an icon and
 * a name), a small × badge at its top-trailing corner, and an optional label such as "Main" at its
 * bottom-leading corner.
 */
export function ComposerAttachment({ id, src, preview, icon, title, label, badge, onRemove, removeLabel }: {
  /** Stable identity; tiles slide into place when others are removed. */
  id: string
  /** Image URL of the thumbnail. */
  src?: string
  /** Draws the thumbnail instead of `src`. */
  preview?: React.ReactNode
  /** Icon of a wide tile (a template, a document). */
  icon?: React.ReactNode
  /** Name shown on a wide tile. Without it the tile is a square thumbnail. */
  title?: string
  /** Accessible name of the tile. */
  label: string
  /** Short label on the thumbnail, such as "Main" for the primary reference. */
  badge?: string
  /** Shows the × badge. */
  onRemove?(): void
  /** Accessible name of the × badge. Defaults to the localized "Remove {label}". */
  removeLabel?: string
}) {
  const { t } = useI18n()
  return (
    <div
      role="listitem"
      className="lab-composer-attachment"
      data-lab-layout-id={id}
      data-wide={title ? '' : undefined}
      aria-label={badge ? `${badge}: ${label}` : label}
    >
      <span className="lab-composer-attachment-media">
        {title ? (
          <span className="lab-composer-attachment-title">
            {icon}
            <span>{title}</span>
          </span>
        ) : (
          preview ?? (src ? <img src={src} alt="" draggable={false} /> : null)
        )}
        {badge && (
          <span className="lab-composer-attachment-badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </span>
      {onRemove && (
        <IconButton
          variant="ghost"
          controlSize="small"
          className="lab-composer-attachment-remove"
          aria-label={removeLabel ?? t('lab.composer.removeItem', { name: label })}
          onClick={(event) => {
            // Focus stays in the composer: on the next tile's ×, else the field.
            const tile = event.currentTarget.closest('.lab-composer-attachment')
            const next =
              tile?.nextElementSibling?.querySelector<HTMLElement>('.lab-composer-attachment-remove') ??
              tile?.previousElementSibling?.querySelector<HTMLElement>('.lab-composer-attachment-remove') ??
              tile?.closest('.lab-composer-capsule')?.querySelector<HTMLElement>('.lab-composer-input')
            next?.focus()
            onRemove()
          }}
        >
          <X aria-hidden="true" />
        </IconButton>
      )}
    </div>
  )
}

export type ComposerBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Content of the round bubble before the capsule, usually one `IconButton` (+, attach). */
  leading?: React.ReactNode
  /** `ComposerAttachments` shown inside the capsule, above the text. */
  attachments?: React.ReactNode
  /** The `ComposerField`. */
  field: React.ReactNode
  /** Chips on the second row's leading end (model, settings), `controlSize="small"`; they take muted ink. Shown while expanded. */
  tools?: React.ReactNode
  /** Icon buttons beside send (AI help), `controlSize="small"` like send. Keep it to one: it stays on the calm bar. */
  actions?: React.ReactNode
  /** The `ComposerSend`. */
  send: React.ReactNode
  /** The field has text: keeps the second row open. */
  hasText: boolean
  /** Dashed outline while a compatible file is dragged over the drop target. */
  dropActive?: boolean
}

/**
 * The composer's floating row, in iOS 26 Liquid Glass: a round `leading` bubble and one capsule
 * holding the attachments, the growing field and, at its trailing end, the actions and send. While
 * it is empty and idle it is one calm line; with text, focus inside or one of its menus open, a
 * second row shows the `tools` (ladder, settings) and the actions and send move under the text.
 * Every layout change (rows, lines, attachments) springs on one `SPRINGS.snappy`. Both bubbles
 * share one glass container inside a `GlassBar`, so text stays readable over moving content.
 */
export function ComposerBar({
  leading,
  attachments,
  field,
  tools,
  actions,
  send,
  hasText,
  dropActive,
  className,
  onFocus,
  onBlur,
  onMouseDown,
  ...props
}: ComposerBarProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const capsule = React.useRef<HTMLElement>(null)
  const [focusWithin, setFocusWithin] = React.useState(false)
  const [pinned, setPinned] = React.useState(false)
  const frame = React.useRef(0)
  const hasTools = tools != null && tools !== false
  const expanded = hasTools && composerExpanded({ hasText, focusWithin, pinned })
  useComposerMotion(capsule)

  React.useEffect(() => {
    const el = root.current
    if (!el) return
    const read = () => setPinned(!!el.querySelector(PINNED))
    read()
    const observer = new MutationObserver(read)
    observer.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-expanded', 'aria-pressed'] })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    <div
      {...props}
      ref={root}
      className={cn('lab-composer-bar', className)}
      onFocus={(event) => {
        cancelAnimationFrame(frame.current)
        setFocusWithin(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        onBlur?.(event)
        // Focus moving between controls of the bar (or into one of its menus) keeps it open.
        cancelAnimationFrame(frame.current)
        frame.current = requestAnimationFrame(() => {
          const el = root.current
          setFocusWithin(!!el && el.contains(document.activeElement))
        })
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        // A click on a control keeps the caret in the field, so the second row stays put under the pointer.
        const active = document.activeElement
        if (active instanceof HTMLTextAreaElement && event.currentTarget.contains(active) && (event.target as HTMLElement).closest('button'))
          event.preventDefault()
      }}
    >
      <GlassBar>
        <GlassScope className="lab-composer-row">
          {leading != null && leading !== false && (
            <GlassGroup className="lab-toolbar-group lab-composer-leading">{leading}</GlassGroup>
          )}
          <GlassGroup
            ref={capsule}
            className="lab-composer-capsule"
            glassMotion="follow"
            data-expanded={expanded}
            data-dragging={dropActive || undefined}
          >
            <div className="lab-composer-grid">
              <div data-composer-slot="attachments" className="lab-composer-slot-attachments" hidden={!attachments}>
                {attachments}
              </div>
              <div data-composer-slot="field" className="lab-composer-slot-field">
                {field}
              </div>
              {hasTools && (
                <div data-composer-slot="tools" className="lab-composer-tools" inert={!expanded}>
                  {tools}
                </div>
              )}
              <div data-composer-slot="actions" className="lab-composer-actions" hidden={actions == null || actions === false}>
                {actions}
              </div>
              <div data-composer-slot="send" className="lab-composer-slot-send">
                {send}
              </div>
            </div>
          </GlassGroup>
        </GlassScope>
      </GlassBar>
    </div>
  )
}

export type PromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
  /** The prompt text (controlled). */
  value: string
  /** Called with the new text on every edit. */
  onValueChange: (value: string) => void
  /** Called by send and Enter, only when the prompt is not blank and submitting is allowed. */
  onSubmit: () => void
  /** Accessible name of the text field. */
  label: string
  /** Animated hint shown while the field is empty. */
  placeholder?: string
  /** Disables the field and blocks submitting. */
  disabled?: boolean
  /** Request in flight: the field turns read-only, the form sets `aria-busy`, send shows the loader. */
  busy?: boolean
  /** With `busy`, send becomes a stop button that calls this. */
  onStop?: () => void
  /** Accessible name of send, such as "Send message". */
  submitLabel: string
  /** Accessible name of send while it stops. Defaults to the localized "Stop". */
  stopLabel?: string
  /** Highlight the capsule while a compatible file is dragged over the drop target. */
  dropActive?: boolean
  /** Blocks submitting without disabling the field. */
  submitDisabled?: boolean
  /** Maximum prompt length in characters. */
  maxLength?: number
  /** Lines the field grows to before it scrolls. Default 6. */
  maxLines?: number
  /** Content of the round bubble before the capsule, usually an attach or + button. */
  leading?: React.ReactNode
  /** `ComposerAttachments` inside the capsule, above the text. */
  attachments?: React.ReactNode
  /** Chips on the second row (model, mode). Shown while the composer has text or focus. */
  tools?: React.ReactNode
  /** Small icon buttons beside send. Keep it to one. */
  actions?: React.ReactNode
  /** Notes or suggestions above the composer. */
  above?: React.ReactNode
  /** Content below the composer, such as a caption or allowance note. */
  footer?: React.ReactNode
}

/**
 * The AI prompt composer: a round leading bubble and a glass capsule whose field grows from one
 * line, with send inside at its trailing end. Tools appear on a second row while it has text or
 * focus. Enter sends; Shift+Enter adds a line.
 */
export function PromptComposer({
  value,
  onValueChange,
  onSubmit,
  label,
  placeholder,
  disabled,
  busy,
  onStop,
  submitLabel,
  stopLabel,
  dropActive,
  submitDisabled,
  maxLength,
  maxLines,
  leading,
  attachments,
  tools,
  actions,
  above,
  footer,
  className,
  ...props
}: PromptComposerProps) {
  const canSubmit = !disabled && !busy && !submitDisabled && !!value.trim()
  const submit = () => {
    if (canSubmit) onSubmit()
  }
  return (
    <form
      {...props}
      className={cn('lab-composer', className)}
      aria-busy={busy || undefined}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {above}
      <ComposerBar
        leading={leading}
        attachments={attachments}
        tools={tools}
        actions={actions}
        hasText={!!value}
        dropActive={dropActive}
        field={
          <ComposerField
            value={value}
            onValueChange={onValueChange}
            label={label}
            placeholder={placeholder}
            maxLength={maxLength}
            maxLines={maxLines}
            disabled={disabled}
            readOnly={busy}
            onSubmit={submit}
          />
        }
        send={
          <ComposerSend
            type="submit"
            label={submitLabel}
            ready={canSubmit}
            submitting={!!busy}
            onStop={onStop}
            stopLabel={stopLabel}
          />
        }
      />
      {footer}
    </form>
  )
}
