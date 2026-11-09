'use client'

import * as React from 'react'
import { FloatingPortalScope } from '../menu/boundary'
import { cn } from '../utils'
import type { PresentationHostProps } from './host'

/** Internal stable host: column and top-layer sheet are the very same DOM subtree. */
export type InPlacePresentation = {
  sheet: boolean
  hidden?: boolean
}

/** Never portal or change the element type: native top-layer promotion does not reparent React. */
export const InPlaceHost = React.forwardRef<HTMLElement, PresentationHostProps & { inPlace: InPlacePresentation }>(function InPlaceHost(
  { inPlace, kind, label, labelledBy, describedBy, children, className, style, initialFocusRef, returnFocusRef, onEscape }, ref
) {
  const node = React.useRef<HTMLDialogElement | null>(null)
  const [layer, setLayer] = React.useState<HTMLDialogElement | null>(null)
  const opener = React.useRef<HTMLElement | null>(null)
  const returnTo = React.useRef(returnFocusRef)
  returnTo.current = returnFocusRef
  const setHost = React.useCallback((element: HTMLDialogElement | null) => {
    node.current = element
    setLayer(element)
  }, [])
  React.useImperativeHandle(ref, () => node.current!, [layer])
  // Snapshot before sibling dialogs switch modes: show()/close() can steal focus before
  // this dialog's layout effect runs, even though its own focused field never unmounted.
  const focusedBeforeCommit = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
    && node.current?.contains(document.activeElement) ? document.activeElement : null
  React.useLayoutEffect(() => {
    const element = node.current
    if (!element) return
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const inside = focusedBeforeCommit ?? (active && element.contains(active) ? active : null)
    // Closing and re-opening is necessary when changing a native dialog's modal mode.
    if (element.open) element.close()
    if (inPlace.hidden) return
    if (inPlace.sheet) {
      if (!inside && active) opener.current = active
      element.showModal()
      ;(inside ?? initialFocusRef?.current ?? element).focus({ preventScroll: true })
    } else {
      element.show()
      inside?.focus({ preventScroll: true })
    }
  }, [inPlace.sheet, inPlace.hidden])
  React.useLayoutEffect(() => () => {
    const element = node.current
    const previous = opener.current
    queueMicrotask(() => {
      if (element?.isConnected) return
      if (element?.open) element.close()
      const target = returnTo.current?.current ?? previous
      if (target?.isConnected && !target.closest('[inert], [hidden]')) target.focus({ preventScroll: true })
    })
  }, [])
  return (
    <dialog
      ref={setHost}
      className={cn('lab-presentation', className)}
      style={style}
      data-kind={kind}
      data-in-place={inPlace.sheet ? 'sheet' : 'column'}
      data-modal={inPlace.sheet || undefined}
      hidden={inPlace.hidden}
      inert={inPlace.hidden || undefined}
      aria-hidden={inPlace.hidden || undefined}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      role={inPlace.sheet ? 'dialog' : 'region'}
      aria-modal={inPlace.sheet && !inPlace.hidden || undefined}
      tabIndex={-1}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onEscape?.() }}
    >
      <FloatingPortalScope element={layer}>{children}</FloatingPortalScope>
    </dialog>
  )
})
