'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

export type PresentationHostProps = {
  /** Which surface this hosts (`alert`, `modal`, `pane`, `sheet`, …); styles key off `data-kind`. */
  kind: string
  /** Accessible name. Ignored when `labelledBy` points at a visible title. */
  label: string
  /** Id of the visible title that names the surface. */
  labelledBy?: string
  /** Id of the text that describes the surface (an alert's message). */
  describedBy?: string
  /** `alertdialog` for decisions that interrupt (Alert); `dialog` otherwise. */
  role?: 'dialog' | 'alertdialog'
  /** True (default) makes the rest of the page inert and traps focus; false leaves it usable. */
  modal?: boolean
  /** Renders inside this positioned element instead of the browser's top layer (previews). */
  container?: HTMLElement | null
  /** Escape was pressed. */
  onEscape?: () => void
  /** Focused once the surface is shown. Default: the browser's choice (the first control). */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused when the surface unmounts; default whatever had focus before it opened. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * The layer every presentation surface lives in: a `<dialog>` covering the viewport in the top
 * layer (or a `role="dialog"` box covering a container), shown modally or not. It owns what all
 * surfaces share: entering and leaving the top layer, the accessible name, Escape, and focus in
 * and back out. Motion, scrim and the surface itself belong to the caller; keep the host mounted
 * until the exit animation ends and unmount it then (focus returns on unmount).
 */
export const PresentationHost = React.forwardRef<HTMLElement, PresentationHostProps>(function PresentationHost(
  {
    kind,
    label,
    labelledBy,
    describedBy,
    role = 'dialog',
    modal = true,
    container,
    onEscape,
    initialFocusRef,
    returnFocusRef,
    className,
    style,
    children,
  },
  ref
) {
  const host = React.useRef<HTMLElement | null>(null)
  const escape = React.useRef(onEscape)
  escape.current = onEscape
  const returnTo = React.useRef(returnFocusRef)
  returnTo.current = returnFocusRef
  React.useImperativeHandle(ref, () => host.current!, [])
  const inline = container !== undefined

  React.useLayoutEffect(() => {
    const element = host.current
    if (!element) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (element instanceof HTMLDialogElement && !element.open) {
      if (modal) element.showModal()
      else element.show()
    }
    const first = initialFocusRef?.current
    if (first) first.focus({ preventScroll: true })
    else if (inline && modal) element.focus({ preventScroll: true })
    return () => {
      if (element instanceof HTMLDialogElement && element.open) element.close()
      // Leave the top layer first: nothing outside a modal dialog can take focus.
      const preferred = returnTo.current?.current
      const target = preferred?.isConnected ? preferred : previous
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
    // A container that arrives later (a ref set after the first render) mounts the host then.
  }, [container])

  const shared = {
    className: cn('lab-presentation', className),
    style,
    'data-kind': kind,
    'data-modal': modal || undefined,
    'aria-label': labelledBy ? undefined : label,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
  }
  if (inline) {
    if (!container) return null
    return createPortal(
      <div
        {...shared}
        ref={host as React.Ref<HTMLDivElement>}
        data-inline=""
        role={role}
        aria-modal={modal || undefined}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !modal) return
          event.stopPropagation()
          escape.current?.()
        }}
      >
        {children}
      </div>,
      container
    )
  }
  return createPortal(
    <dialog
      {...shared}
      ref={host as React.Ref<HTMLDialogElement>}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        escape.current?.()
      }}
    >
      {children}
    </dialog>,
    document.body
  )
})

/**
 * Keeps a surface mounted while it leaves: `mounted` turns true as soon as `open` does, and false
 * only when the surface calls `exited()` at the end of its exit animation.
 */
export function usePresented(open: boolean) {
  const [mounted, setMounted] = React.useState(open)
  if (open && !mounted) setMounted(true)
  const exited = React.useCallback(() => setMounted(false), [])
  return { mounted, exited }
}
