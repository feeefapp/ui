'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { cn } from '../utils'
import { useLatched } from '../motion'
import { GlassScope } from '../glass/container'
import { PresentationHost, usePresented } from '../presentation/host'
import { CloseBubble, PresentationHeader } from '../presentation/header'
import { PresentationBody } from '../presentation/body'
import { slidePlan, useSurfaceMotion } from '../presentation/motion'
import type { SheetProps } from './sheet'
import '../presentation/presentation.css'

/** Width of the area a sheet presents over: the container, or the window. */
export function useHostWidth(container: HTMLElement | null | undefined) {
  const [width, setWidth] = React.useState(() =>
    typeof window === 'undefined' ? 1024 : container ? container.clientWidth : window.innerWidth
  )
  React.useLayoutEffect(() => {
    if (container === null) return
    const measure = () => setWidth(container ? container.clientWidth : window.innerWidth)
    measure()
    if (container) {
      const observer = new ResizeObserver(measure)
      observer.observe(container)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [container])
  return width
}

/**
 * A sheet's `pane` presentation on wide screens: a full-height opaque panel the shell gap G from
 * the screen edges that slides in from `paneSide` (mirrored in RTL), with the close bubble floating
 * beside it, a floating glass header and a dock.
 */
export function SheetPane(props: SheetProps) {
  const { mounted, exited } = usePresented(props.open)
  const shown = useLatched(props, props.open)
  if (!mounted) return null
  return <PanePresentation {...shown} open={props.open} onOpenChange={props.onOpenChange} onExited={exited} />
}

function PanePresentation({
  open,
  onOpenChange,
  label,
  title,
  leading,
  trailing,
  showClose = true,
  header,
  dock,
  children,
  paneWidth = 420,
  paneSide = 'end',
  modal = true,
  dismissible = true,
  contentPadding = 16,
  initialFocusRef,
  returnFocusRef,
  container,
  className,
  onExited,
}: SheetProps & { onExited: () => void }) {
  const { t } = useI18n()
  const frame = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  useSurfaceMotion(open, frame, scrim, onExited, (opening, motion, now, element) => {
    // The end side is the right in LTR: off screen means a positive x there, negative in RTL.
    const rtl = getComputedStyle(element).direction === 'rtl'
    const outward = (paneSide === 'end' ? 1 : -1) * (rtl ? -1 : 1)
    return slidePlan(opening, motion, now, `translate3d(${element.offsetWidth * outward}px, 0, 0)`)
  })

  const close = () => {
    if (open) onOpenChange(false)
  }
  const dismiss = () => {
    if (dismissible) close()
  }
  const closeLabel = t('lab.composer.closeLabel', { label })
  const top =
    header !== undefined ? (
      header
    ) : (
      <PresentationHeader title={title} leading={leading} titleId={titleId} trailing={trailing} />
    )
  const labelledBy = header === undefined && leading == null && title != null ? titleId : undefined
  return (
    <PresentationHost
      kind="pane"
      label={label}
      labelledBy={labelledBy}
      modal={modal}
      container={container}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
      onEscape={dismiss}
    >
      {modal && <div ref={scrim} className="lab-presentation-scrim" aria-hidden="true" onClick={dismiss} />}
      <div
        ref={frame}
        className="lab-pane-frame"
        data-side={paneSide}
        style={{ '--lab-pane-width': `${paneWidth}px` } as React.CSSProperties}
        onKeyDown={(event) => {
          // A non-modal pane is not a modal dialog: Escape reaches it only through this frame.
          if (!modal && event.key === 'Escape') {
            event.stopPropagation()
            dismiss()
          }
        }}
      >
        {showClose && (
          <GlassScope className="lab-pane-close">
            <CloseBubble label={closeLabel} onClose={close} />
          </GlassScope>
        )}
        <div className={cn('lab-pane', className)}>
          <PresentationBody label={label} top={top} bottom={dock} fill contentPadding={contentPadding}>
            {children}
          </PresentationBody>
        </div>
      </div>
    </PresentationHost>
  )
}
