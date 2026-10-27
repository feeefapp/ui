'use client'

import * as React from 'react'
import { FloatingPortalScope } from '../menu/boundary'
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
 * Enters the top layer from the dialog's first child, so the dialog is shown before any of its
 * content runs a layout effect: React runs children's layout effects before their parent's, and
 * everything measured in a closed (display: none) dialog would read zeros (a dock sized to its
 * padding, glass that then grows in, a body height of 0).
 */
function TopLayerEntry({ modal, opener }: { modal: boolean; opener: React.MutableRefObject<HTMLElement | null> }) {
  const mark = React.useRef<HTMLSpanElement>(null)
  React.useLayoutEffect(() => {
    const dialog = mark.current?.parentElement
    if (!(dialog instanceof HTMLDialogElement) || dialog.open) return
    // Showing a modal dialog moves focus into it: remember what had it, to give it back.
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (modal) dialog.showModal()
    else dialog.show()
  }, [])
  return <span ref={mark} hidden />
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
  // Floating panels opened inside render into the surface (see FloatingPortalScope).
  const [layer, setLayer] = React.useState<HTMLElement | null>(null)
  const setHost = React.useCallback((node: HTMLElement | null) => {
    host.current = node
    setLayer(node)
  }, [])
  const escape = React.useRef(onEscape)
  escape.current = onEscape
  const returnTo = React.useRef(returnFocusRef)
  returnTo.current = returnFocusRef
  const opener = React.useRef<HTMLElement | null>(null)
  /** What had focus before the surface opened, kept across an effect that runs again. */
  const giveBack = React.useRef<HTMLElement | null>(null)
  // Follows the element: a host open before its container exists mounts it later.
  React.useImperativeHandle(ref, () => host.current!, [container, layer])
  const inline = container !== undefined

  React.useLayoutEffect(() => {
    const element = host.current
    if (!element) return
    // A field that focused itself while mounting (React's `autoFocus`) keeps focus: showing the
    // dialog would hand it to the first control, and the blur would mark the field as visited.
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const autofocused = active && element.contains(active) ? active : null
    // TopLayerEntry already showed the dialog and remembered what had focus before it.
    const previous = opener.current ?? (autofocused ? null : active)
    opener.current = null
    if (previous && !element.contains(previous)) giveBack.current = previous
    if (element instanceof HTMLDialogElement && !element.open) {
      if (modal) element.showModal()
      else element.show()
    }
    const first = initialFocusRef?.current ?? autofocused
    if (first) first.focus({ preventScroll: true })
    else if (inline && modal) element.focus({ preventScroll: true })
    return () => {
      // React can run this effect again at once (Strict Mode, a new container): closing and
      // handing focus back then would blur the field inside. Only a host that really left does it.
      queueMicrotask(() => {
        if (element.isConnected) return
        // Leave the top layer first: nothing outside a modal dialog can take focus.
        if (element instanceof HTMLDialogElement && element.open) element.close()
        const preferred = returnTo.current?.current
        const target = preferred?.isConnected ? preferred : giveBack.current
        if (target?.isConnected) target.focus({ preventScroll: true })
      })
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
        ref={setHost}
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
        <FloatingPortalScope element={layer}>{children}</FloatingPortalScope>
      </div>,
      container
    )
  }
  return createPortal(
    <dialog
      {...shared}
      ref={setHost}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        escape.current?.()
      }}
    >
      <TopLayerEntry modal={modal} opener={opener} />
      <FloatingPortalScope element={layer}>{children}</FloatingPortalScope>
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
