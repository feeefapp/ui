'use client'

import * as React from 'react'
import { useLabI18n } from '../i18n'
import { X } from 'lucide-react'
import { cn } from '../utils'
import { usePresence, useLatched, type PresenceState } from '../motion'
import { LabButton, LabIconButton } from './button'
import { LabToolbarGroup } from '../toolbar'
import { LabScrollArea, type LabScrollAreaProps } from '../scroll'

export function LabModal({
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
  open?: boolean
  children: React.ReactNode
  close: () => void
  label: string
  wide?: boolean
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
  bottom?: React.ReactNode
  /** Focused after the native dialog opens; keep the ref stable across content edits. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focus restored after the dialog finishes closing, even if its original trigger unmounted. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  scrollOptions?: Pick<LabScrollAreaProps, 'edgeGap' | 'contentPadding'>
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
    <LabDialog state={state} close={close} {...content}>
      {content.children}
    </LabDialog>
  )
}

function LabDialog({
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
  scrollOptions?: Pick<LabScrollAreaProps, 'edgeGap' | 'contentPadding'>
}) {
  const { t } = useLabI18n()
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
    observer.observe(content)
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
        <LabScrollArea
          {...scrollOptions}
          label={label}
          top={
            headerless ? (
              top
            ) : (
              <header
                className={cn(
                  'lab-modal-floating-top',
                  defaultTitle && 'lab-modal-floating-top--default'
                )}
              >
                <div className="lab-modal-floating-title">
                  {top ?? (
                    <LabToolbarGroup label="Dialog title">
                      <h2 id={titleId} className="lab-modal-title">
                        {label}
                      </h2>
                    </LabToolbarGroup>
                  )}
                </div>
                {showClose && (
                  <LabToolbarGroup label="Dialog close action">
                    <LabIconButton
                      variant="text"
                      appearance="toolbar"
                      controlSize="compact"
                      className="lab-modal-close"
                      aria-label={t('lab.composer.closeLabel', { label })}
                      disabled={state !== 'open'}
                      onClick={close}
                    >
                      <X size={20} aria-hidden="true" />
                    </LabIconButton>
                  </LabToolbarGroup>
                )}
              </header>
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
        </LabScrollArea>
      ) : (
        <>
          {!headerless && showClose && (
            <LabButton
              variant="ghost"
              controlSize="icon"
              className="lab-close"
              aria-label={t('lab.common.close')}
              onClick={close}
            >
              <X size={18} />
            </LabButton>
          )}
          {children}
        </>
      )}
    </dialog>
  )
}
