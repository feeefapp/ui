'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { cn } from '../utils'
import { useLatched } from '../motion'
import { PresentationHost, usePresented } from './host'
import { PresentationHeader } from './header'
import { PresentationBody } from './body'
import { usePopMotion } from './motion'
import './presentation.css'

/** Header and dock props shared by every presentation surface (Modal, Pane, Sheet). */
export type PresentationChromeProps = {
  /** Accessible name. Also names the close button (“Close Edit delivery address”). */
  label: string
  /** Visible title in the floating header's title bubble. */
  title?: React.ReactNode
  /** More header bubbles before the close bubble (a Reset, a Done, a view switch). */
  trailing?: React.ReactNode
  /** Shows the close bubble at the end of the header. Default true; set false when a visible Cancel exists. */
  showClose?: boolean
  /** Replaces the whole floating header (title, trailing, close): a search bar, tabs, a toolbar. */
  header?: React.ReactNode
  /** Floating chrome over the bottom, usually a `PresentationDock` with the actions. */
  dock?: React.ReactNode
}

export type ModalProps = PresentationChromeProps & {
  /** Shows the dialog. Keep it mounted and toggle this so it can fade out. */
  open: boolean
  /** Called with `false` by Escape, a backdrop click and the close bubble. */
  onOpenChange: (open: boolean) => void
  /** The content. It scrolls under the floating header and dock. */
  children: React.ReactNode
  /** Takes the full height (up to 720px) instead of hugging the content: lists, long forms. */
  fill?: boolean
  /** The wider width (980px instead of 560px), for side-by-side content. */
  wide?: boolean
  /** Whether Escape and a backdrop click close it. Default true. The close bubble always does. */
  dismissible?: boolean
  /** Space in px between the floats and the dialog's edges. Default: the shell gap G. */
  edgeGap?: number
  /** Content padding in px. Default 16 (a card's inside). */
  contentPadding?: number
  /** Focused when the dialog opens. Default: the first control. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused after it closes, when the control that opened it may be gone. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Renders inside this positioned element instead of the top layer (previews). */
  container?: HTMLElement | null
  /** Class name of the dialog surface. */
  className?: string
}

/**
 * A centred dialog for a short task with a form: content on an opaque card that hugs it (or
 * fills the height), a floating glass header with the title and a close bubble, and the actions
 * in a floating dock. It opens with a small spring and fades out; focus is trapped inside and
 * returns to the opener. Use `Alert` for a plain decision, `Pane` for details beside the page.
 */
export function Modal(props: ModalProps) {
  const { mounted, exited } = usePresented(props.open)
  // The exit fades out the last open content, not whatever the parent renders while closing.
  const shown = useLatched(props, props.open)
  if (!mounted) return null
  return <ModalPresentation {...shown} open={props.open} onOpenChange={props.onOpenChange} onExited={exited} />
}

function ModalPresentation({
  open,
  onOpenChange,
  label,
  title,
  trailing,
  showClose = true,
  header,
  dock,
  children,
  fill = false,
  wide = false,
  dismissible = true,
  edgeGap,
  contentPadding = 16,
  initialFocusRef,
  returnFocusRef,
  container,
  className,
  onExited,
}: ModalProps & { onExited: () => void }) {
  const { t } = useI18n()
  const surface = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  usePopMotion(open, surface, scrim, onExited)
  const close = () => {
    if (open) onOpenChange(false)
  }
  const dismiss = () => {
    if (dismissible) close()
  }
  const top =
    header !== undefined ? (
      header
    ) : (
      <PresentationHeader
        title={title}
        titleId={titleId}
        trailing={trailing}
        onClose={showClose ? close : undefined}
        closeLabel={t('lab.composer.closeLabel', { label })}
      />
    )
  const labelledBy = header === undefined && title != null ? titleId : undefined
  return (
    <PresentationHost
      kind="modal"
      label={label}
      labelledBy={labelledBy}
      container={container}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
      onEscape={dismiss}
    >
      <div ref={scrim} className="lab-presentation-scrim" aria-hidden="true" onClick={dismiss} />
      <div
        ref={surface}
        className={cn('lab-modal', wide && 'lab-modal--wide', className)}
        data-fill={fill || undefined}
      >
        <PresentationBody label={label} top={top} bottom={dock} fill={fill} edgeGap={edgeGap} contentPadding={contentPadding}>
          {children}
        </PresentationBody>
      </div>
    </PresentationHost>
  )
}
