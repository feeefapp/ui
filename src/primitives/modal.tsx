'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { X } from 'lucide-react'
import { cn } from '../utils'
import { usePresence, useLatched, type PresenceState } from '../motion'
import { Button, IconButton } from './button'
import { ToolbarGroup } from '../toolbar'
import { ScrollArea, type ScrollAreaProps } from '../scroll'
import { GlassScope } from '../glass/container'

/**
 * A modal dialog on the native `<dialog>`: focus is trapped, Escape and a backdrop click call
 * `close`, and focus returns to the opener after the exit transition.
 */
export function Modal({
  open = true,
  children,
  close,
  label,
  wide = false,
  className,
  scrollable = false,
  top,
  bottom,
  initialFocusRef,
  returnFocusRef,
  scrollOptions,
  fitContent = false,
  headerless = false,
  showClose = true,
}: {
  /** Whether the dialog is shown. Keep it mounted and toggle this so the exit transition can run. */
  open?: boolean
  /** Dialog body. */
  children: React.ReactNode
  /** Called by Escape, a backdrop click and the close button. Set `open` to false here. */
  close: () => void
  /** Accessible name; also the default title in a scrollable dialog. */
  label: string
  /** Uses the wider dialog width, for side-by-side content such as two calendars. */
  wide?: boolean
  /** Class name for the `<dialog>` element. */
  className?: string
  /** Full-bleed content with measured floating chrome. Preferred for new scrollable dialogs. */
  scrollable?: boolean
  /** Omit default chrome when the content supplies its own heading and dismiss action. */
  headerless?: boolean
  /** Hide the default dismiss icon when a visible Cancel/Close action already exists. */
  showClose?: boolean
  /** Measure body and floating chrome, capped at the viewport. */
  fitContent?: boolean
  /** Optional leading header content. The default is the dialog label as a quiet title. */
  top?: React.ReactNode
  /** Floating bottom chrome for a scrollable dialog, usually a `Dock` with the dialog's actions. */
  bottom?: React.ReactNode
  /** Focused after the native dialog opens; keep the ref stable across content edits. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focus restored after the dialog finishes closing, even if its original trigger unmounted. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Scrollable dialogs only: spacing passed to the inner `ScrollArea` (default: floats the shell gap G from the edges, content padding 16). */
  scrollOptions?: Pick<ScrollAreaProps, 'edgeGap' | 'contentPadding'>
}) {
  const { mounted, state } = usePresence(open, 200)
  const content = useLatched(
    {
      children,
      label,
      wide,
      className,
      scrollable,
      top,
      bottom,
      initialFocusRef,
      returnFocusRef,
      scrollOptions,
      fitContent,
      headerless,
      showClose,
    },
    open
  )
  if (!mounted) return null
  return (
    <Dialog state={state} close={close} {...content}>
      {content.children}
    </Dialog>
  )
}

function Dialog({
  state,
  children,
  close,
  label,
  wide,
  className,
  scrollable,
  top,
  bottom,
  initialFocusRef,
  returnFocusRef,
  scrollOptions,
  fitContent,
  headerless,
  showClose,
}: {
  state: PresenceState
  children: React.ReactNode
  close: () => void
  label: string
  wide: boolean
  className?: string
  scrollable: boolean
  headerless: boolean
  showClose: boolean
  fitContent: boolean
  top?: React.ReactNode
  bottom?: React.ReactNode
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focus restored after the dialog finishes closing, even if its original trigger unmounted. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  scrollOptions?: Pick<ScrollAreaProps, 'edgeGap' | 'contentPadding'>
}) {
  const { t } = useI18n()
  const ref = React.useRef<HTMLDialogElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = React.useState<number>()
  React.useLayoutEffect(() => {
    if (!fitContent || !scrollable || !ref.current || !bodyRef.current) return
    const dialog = ref.current
    const body = bodyRef.current
    const content = body.parentElement!
    const measure = () => {
      if (!dialog.open) return
      const padding = getComputedStyle(content)
      const border = getComputedStyle(dialog)
      const topFloat = dialog.querySelector<HTMLElement>('.lab-scroll-float--top')
      const bottomFloat = dialog.querySelector<HTMLElement>('.lab-scroll-float--bottom')
      const chromeMinimum =
        (topFloat?.offsetHeight ?? 0) +
        (bottomFloat?.offsetHeight ?? 0) +
        (topFloat ? parseFloat(getComputedStyle(topFloat).top) || 0 : 0) +
        (bottomFloat ? parseFloat(getComputedStyle(bottomFloat).bottom) || 0 : 0)
      const next = Math.ceil(
        Math.max(
          chromeMinimum,
          body.offsetHeight +
            parseFloat(padding.paddingTop) +
            parseFloat(padding.paddingBottom) +
            parseFloat(border.borderTopWidth) +
            parseFloat(border.borderBottomWidth)
        )
      )
      setContentHeight((previous) => (previous === next ? previous : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    // Border box: the floats' reserved padding can change without the body resizing.
    observer.observe(content, { box: 'border-box' })
    dialog.querySelectorAll('.lab-scroll-float').forEach((element) => observer.observe(element))
    const frame = requestAnimationFrame(measure)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [fitContent, scrollable, headerless, showClose, Boolean(top), Boolean(bottom)])
  const openingFocusRef = React.useRef(initialFocusRef)
  const closingFocusRef = React.useRef(returnFocusRef)
  const titleId = React.useId()
  const defaultTitle = scrollable && !headerless && top == null
  React.useEffect(() => {
    const dialog = ref.current!
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    openingFocusRef.current?.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      // React can detach the dialog before this passive cleanup, so native
      // close() alone cannot reliably restore focus to the opening control.
      const preferred = closingFocusRef.current?.current
      const target = preferred?.isConnected ? preferred : previousFocus
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      data-state={state}
      className={cn(
        'lab-dialog',
        wide && 'lab-dialog-wide',
        scrollable && 'lab-dialog--scrollable',
        fitContent && scrollable && 'lab-dialog--fit-content',
        className
      )}
      style={
        fitContent && contentHeight !== undefined
          ? ({ '--lab-modal-content-height': `${contentHeight}px` } as React.CSSProperties)
          : undefined
      }
      aria-label={defaultTitle ? undefined : label}
      aria-labelledby={defaultTitle ? titleId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        if (state === 'open') close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && state === 'open') close()
      }}
    >
      {scrollable ? (
        <ScrollArea
          // Floats sit the shell gap G from the dialog's edges; its content is inside a card: 16.
          edgeGap={scrollOptions?.edgeGap}
          contentPadding={scrollOptions?.contentPadding ?? 16}
          label={label}
          top={
            headerless ? (
              top
            ) : (
              <GlassScope
                as="header"
                className={cn(
                  'lab-modal-floating-top',
                  defaultTitle && 'lab-modal-floating-top--default'
                )}
              >
                <div className="lab-modal-floating-title">
                  {top ?? (
                    <ToolbarGroup label="Dialog title">
                      <h2 id={titleId} className="lab-modal-title">
                        {label}
                      </h2>
                    </ToolbarGroup>
                  )}
                </div>
                {showClose && (
                  <ToolbarGroup label="Dialog close action">
                    <IconButton
                      variant="text"
                      appearance="toolbar"
                      controlSize="regular"
                      className="lab-modal-close"
                      aria-label={t('lab.composer.closeLabel', { label })}
                      disabled={state !== 'open'}
                      onClick={close}
                    >
                      <X size={20} aria-hidden="true" />
                    </IconButton>
                  </ToolbarGroup>
                )}
              </GlassScope>
            )
          }
          bottom={bottom}
        >
          {fitContent ? (
            <div ref={bodyRef} className="lab-modal-measured-body">
              {children}
            </div>
          ) : (
            children
          )}
        </ScrollArea>
      ) : (
        <>
          {!headerless && showClose && (
            <Button
              variant="ghost"
              controlSize="icon"
              className="lab-close"
              aria-label={t('lab.common.close')}
              onClick={close}
            >
              <X size={18} />
            </Button>
          )}
          {children}
        </>
      )}
    </dialog>
  )
}
