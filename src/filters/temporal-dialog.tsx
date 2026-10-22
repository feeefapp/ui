'use client'

import type { FormEventHandler, ReactNode, RefObject } from 'react'
import { LabButton } from '../primitives/button'
import { LabModal } from '../primitives/modal'
import { LabToolbarGroup } from '../toolbar'
import { cn } from '../utils'
import {
  LabTemporalBody,
  LabTemporalEdges,
  LabTemporalPresets,
  useLabTemporalEditor,
  type LabTemporalEditorOptions,
} from './temporal-editor'
import './temporal-dialog.css'

/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export function LabTemporalDialog({
  open,
  label,
  close,
  returnFocusRef,
  formId,
  onSubmit,
  onClear,
  clearLabel = 'Clear',
  clearDisabled,
  applyLabel = 'Apply',
  showApply = true,
  error,
  intro,
  dir,
  className,
  ...options
}: LabTemporalEditorOptions & {
  /** Shows the dialog. Changing it also resets the editor's month and active end. */
  open: boolean
  /** Accessible name of the dialog. */
  label: string
  /** Called by Cancel, Escape and the backdrop. */
  close: () => void
  /** Focus target after closing, usually the trigger. */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Id of the form that Apply submits. */
  formId: string
  /** The form's submit handler: validate, commit and close. */
  onSubmit: FormEventHandler<HTMLFormElement>
  /** Clear action; omitted means no Clear button. */
  onClear?: () => void
  clearLabel?: string
  clearDisabled?: boolean
  applyLabel?: string
  /** False for pickers that commit on pick (a single date). */
  showApply?: boolean
  /** Validation message shown under the calendars. */
  error?: ReactNode
  /** Optional sentence above the calendars. */
  intro?: ReactNode
  dir?: 'ltr' | 'rtl'
  className?: string
}) {
  const editor = useLabTemporalEditor({ ...options, resetKey: open })
  const bar = !!editor.presets.length || (editor.range && editor.hasCalendar)
  return (
    <LabModal
      open={open}
      label={label}
      close={close}
      returnFocusRef={returnFocusRef}
      scrollable
      fitContent
      headerless
      showClose={false}
      // Content starts where the buttons inside the bars start (bar inset + the group's 2px padding).
      scrollOptions={{ edgeGap: 12, contentPadding: 14 }}
      className={cn(
        'lab-temporal-dialog',
        editor.range && editor.hasCalendar && 'lab-temporal-dialog--pair',
        className
      )}
      top={
        bar ? (
          <div className="lab-temporal-dialog-bar" dir={dir}>
            {editor.range && editor.hasCalendar && (
              <LabToolbarGroup label="Range ends" className="lab-temporal-dialog-edges">
                <LabTemporalEdges editor={editor} appearance="plain" />
              </LabToolbarGroup>
            )}
            {!!editor.presets.length && (
              <LabToolbarGroup label="Quick choices" className="lab-temporal-dialog-presets">
                <LabTemporalPresets editor={editor} layout="bar" />
              </LabToolbarGroup>
            )}
          </div>
        ) : (
          <div className="lab-temporal-dialog-bar" dir={dir}>
            <LabToolbarGroup label="Dialog title" className="lab-temporal-dialog-title">
              <h2 className="lab-modal-title">{label}</h2>
            </LabToolbarGroup>
          </div>
        )
      }
      bottom={
        <div className="lab-temporal-dialog-bar" dir={dir}>
          <LabToolbarGroup label={`${label} actions`} className="lab-temporal-dialog-actions">
            <LabButton variant="text" appearance="toolbar" controlSize="compact" onClick={close}>
              Cancel
            </LabButton>
            <span className="lab-temporal-dialog-spacer" />
            {onClear && (
              <LabButton
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                disabled={clearDisabled}
                onClick={onClear}
              >
                {clearLabel}
              </LabButton>
            )}
            {showApply && (
              <LabButton variant="filled" appearance="toolbar" controlSize="compact" type="submit" form={formId}>
                {applyLabel}
              </LabButton>
            )}
          </LabToolbarGroup>
        </div>
      }
    >
      <form id={formId} className="lab-temporal-dialog-form" dir={dir} onSubmit={onSubmit}>
        {intro && <p className="lab-temporal-dialog-intro">{intro}</p>}
        <div className="lab-temporal-editor" data-calendar={editor.hasCalendar} data-range={editor.range}>
          <LabTemporalBody editor={editor} />
        </div>
        {error && (
          <p role="alert" className="lab-filter-error">
            {error}
          </p>
        )}
      </form>
    </LabModal>
  )
}
