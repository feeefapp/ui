'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { Dock } from '../dock'

export type PresentationDockProps = {
  /** Accessible name of the group. Default “Actions”. */
  label?: string
  /** A compact status before the actions (“3 selected”). */
  content?: React.ReactNode
  /** The surface's actions: Cancel as `text`, the one main action `filled`, last. */
  children: React.ReactNode
  className?: string
}

/**
 * The actions of a presentation surface in one floating glass dock. Put it in a surface's `dock`
 * (or a `PresentationBody` `bottom`) so the actions never scroll away.
 */
export function PresentationDock({ label, content, children, className }: PresentationDockProps) {
  const { t } = useI18n()
  return (
    <Dock label={label ?? t('lab.presentation.actions')} content={content} className={className}>
      {children}
    </Dock>
  )
}
