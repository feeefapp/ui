'use client'

import type { FormEventHandler, ReactNode, RefObject } from 'react'
import { Button } from '../primitives/button'
import { Modal } from '../primitives/modal'
import { ToolbarGroup } from '../toolbar'
import { cn } from '../utils'
import {
  TemporalBody,
  TemporalEdges,
  TemporalPresets,
  useTemporalEditor,
  type TemporalEditorOptions,
} from './temporal-editor'
import './temporal-dialog.css'

/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export function TemporalDialog({
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
}: TemporalEditorOptions & {
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
  const editor = useTemporalEditor({ ...options, resetKey: open })
  const bar = !!editor.presets.length || (editor.range && editor.hasCalendar)
  return (
    <Modal
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
              <ToolbarGroup label="Range ends" className="lab-temporal-dialog-edges">
                <TemporalEdges editor={editor} appearance="plain" />
              </ToolbarGroup>
            )}
            {!!editor.presets.length && (
              <ToolbarGroup label="Quick choices" className="lab-temporal-dialog-presets">
                <TemporalPresets editor={editor} layout="bar" />
              </ToolbarGroup>
            )}
          </div>
        ) : (
          <div className="lab-temporal-dialog-bar" dir={dir}>
            <ToolbarGroup label="Dialog title" className="lab-temporal-dialog-title">
              <h2 className="lab-modal-title">{label}</h2>
            </ToolbarGroup>
          </div>
        )
      }
      bottom={
        <div className="lab-temporal-dialog-bar" dir={dir}>
          <ToolbarGroup label={`${label} actions`} className="lab-temporal-dialog-actions">
            <Button variant="text" appearance="toolbar" controlSize="compact" onClick={close}>
              Cancel
            </Button>
            <span className="lab-temporal-dialog-spacer" />
            {onClear && (
              <Button
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                disabled={clearDisabled}
                onClick={onClear}
              >
                {clearLabel}
              </Button>
            )}
            {showApply && (
              <Button variant="filled" appearance="toolbar" controlSize="compact" type="submit" form={formId}>
                {applyLabel}
              </Button>
            )}
          </ToolbarGroup>
        </div>
      }
    >
      <form id={formId} className="lab-temporal-dialog-form" dir={dir} onSubmit={onSubmit}>
        {intro && <p className="lab-temporal-dialog-intro">{intro}</p>}
        <div className="lab-temporal-editor" data-calendar={editor.hasCalendar} data-range={editor.range}>
          <TemporalBody editor={editor} />
        </div>
        {error && (
          <p role="alert" className="lab-filter-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
