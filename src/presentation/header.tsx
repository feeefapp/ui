'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { cn } from '../utils'
import { IconButton } from '../primitives/button'
import { ToolbarGroup } from '../toolbar'
import { GlassScope } from '../glass/container'
import './presentation.css'

export type PresentationHeaderProps = {
  /** The title, in a glass bubble at the start. Omit for no title bubble. */
  title?: React.ReactNode
  /** Custom content at the start instead of the title bubble (a search field, a back button with a heading). */
  leading?: React.ReactNode
  /** Id for the title heading, so the surface can be labelled by it. */
  titleId?: string
  /** More bubbles before the close bubble: a Reset, a Done, a view switch. */
  trailing?: React.ReactNode
  /** Shows the close bubble at the end and is called when it is pressed. */
  onClose?: () => void
  /** Accessible name of the close button. Default “Close”. */
  closeLabel?: string
  /** Disables the close button (while a save runs, say). A leaving surface keeps its look: closing twice does nothing. */
  closeDisabled?: boolean
  className?: string
}

/**
 * The floating header of a presentation surface (Modal, Sheet): a title bubble at the start,
 * optional trailing bubbles and a close bubble at the end, all glass in one `GlassScope` so they
 * merge and share light. Put it in a `PresentationBody` `top` slot; it renders nothing when it has
 * nothing to show.
 */
export function PresentationHeader({
  title,
  leading,
  titleId,
  trailing,
  onClose,
  closeLabel,
  closeDisabled = false,
  className,
}: PresentationHeaderProps) {
  const { t } = useI18n()
  if (title == null && leading == null && trailing == null && !onClose) return null
  const close = closeLabel ?? t('lab.common.close')
  return (
    <GlassScope as="header" className={cn('lab-presentation-header', className)}>
      <div className="lab-presentation-header-start">
        {leading ?? (title != null && (
          <ToolbarGroup label={t('lab.presentation.title')} className="lab-presentation-header-title">
            <h2 id={titleId} className="lab-presentation-title">
              {title}
            </h2>
          </ToolbarGroup>
        ))}
      </div>
      {trailing}
      {onClose && <CloseBubble label={close} disabled={closeDisabled} onClose={onClose} />}
    </GlassScope>
  )
}

/** The close bubble: one glass group holding the close button. Kit-internal (header and a sheet's pane). */
export function CloseBubble({
  label,
  disabled = false,
  onClose,
  className,
}: {
  label: string
  disabled?: boolean
  onClose: () => void
  className?: string
}) {
  return (
    <ToolbarGroup label={label} className={cn('lab-presentation-close', className)}>
      <IconButton
        variant="text"
        appearance="toolbar"
        controlSize="regular"
        aria-label={label}
        disabled={disabled}
        onClick={onClose}
      >
        <X size={20} aria-hidden="true" />
      </IconButton>
    </ToolbarGroup>
  )
}
