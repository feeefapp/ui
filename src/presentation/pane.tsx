'use client'

import * as React from 'react'
import { useI18n } from '../i18n'
import { cn } from '../utils'
import { useLatched } from '../motion'
import { GlassScope } from '../glass/container'
import { Sheet } from '../containers/sheet'
import { PresentationHost, usePresented } from './host'
import { CloseBubble, PresentationHeader } from './header'
import { PresentationBody } from './body'
import { slidePlan, useSurfaceMotion } from './motion'
import type { PresentationChromeProps } from './modal'
import './presentation.css'

export type PaneProps = PresentationChromeProps & {
  /** Shows the pane. Keep it mounted and toggle this so it can slide out. */
  open: boolean
  /** Called with `false` by Escape, a backdrop click, the close bubble (and a drag down as a sheet). */
  onOpenChange: (open: boolean) => void
  /** The content. It scrolls under the floating header and dock. */
  children: React.ReactNode
  /** Width in px. Default 420, at most 60% of the window. */
  width?: number
  /** The side it slides in from: `end` (default; the right in LTR, the left in RTL) or `start`. */
  side?: 'end' | 'start'
  /**
   * True (default) dims the page and traps focus. False leaves the page usable beside it, like an
   * inspector: no scrim, no focus trap; Escape still closes it while focus is inside.
   */
  modal?: boolean
  /** As a sheet on phones: open at full height instead of fitting the content. */
  fill?: boolean
  /** Whether Escape, a backdrop click and (as a sheet) a drag down close it. Default true. */
  dismissible?: boolean
  /** Below this width (px) the same content is a bottom `Sheet`. Default 720. */
  compactBreakpoint?: number
  /** Space in px between the floats and the pane's edges. Default: the shell gap G. */
  edgeGap?: number
  /** Content padding in px. Default 16 (a card's inside). */
  contentPadding?: number
  /** Focused when the pane opens. Default: the first control. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused after it closes, when the control that opened it may be gone. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Renders inside this positioned element instead of the top layer (previews). */
  container?: HTMLElement | null
  /** Class name of the pane surface. */
  className?: string
}

/** Width of the area the pane presents over: the container, or the window. */
function useHostWidth(container: HTMLElement | null | undefined) {
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
 * An inspector beside the page: a full-height opaque panel the shell gap G from the screen edges
 * that slides in from the end side (mirrored in RTL), with the close bubble floating beside it,
 * a floating glass header and a dock. Below the compact breakpoint the same content is a bottom
 * `Sheet`, so you write it once. Use it for the details of the thing the page is about.
 */
export function Pane(props: PaneProps) {
  const width = useHostWidth(props.container)
  const compact = width < (props.compactBreakpoint ?? 720)
  if (compact) {
    const { width: _width, side: _side, compactBreakpoint: _breakpoint, edgeGap: _gap, fill, contentPadding, ...rest } = props
    return <Sheet {...rest} detents={[fill ? 'large' : 'fit']} regular="sheet" contentPadding={contentPadding ?? 16} />
  }
  return <DesktopPane {...props} />
}

function DesktopPane(props: PaneProps) {
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
  trailing,
  showClose = true,
  header,
  dock,
  children,
  width = 420,
  side = 'end',
  modal = true,
  dismissible = true,
  edgeGap,
  contentPadding = 16,
  initialFocusRef,
  returnFocusRef,
  container,
  className,
  onExited,
}: PaneProps & { onExited: () => void }) {
  const { t } = useI18n()
  const frame = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  useSurfaceMotion(open, frame, scrim, onExited, (opening, motion, now, element) => {
    // The end side is the right in LTR: off screen means a positive x there, negative in RTL.
    const rtl = getComputedStyle(element).direction === 'rtl'
    const outward = (side === 'end' ? 1 : -1) * (rtl ? -1 : 1)
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
      <PresentationHeader title={title} titleId={titleId} trailing={trailing} />
    )
  const labelledBy = header === undefined && title != null ? titleId : undefined
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
        data-side={side}
        style={{ '--lab-pane-width': `${width}px` } as React.CSSProperties}
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
          <PresentationBody label={label} top={top} bottom={dock} fill edgeGap={edgeGap} contentPadding={contentPadding}>
            {children}
          </PresentationBody>
        </div>
      </div>
    </PresentationHost>
  )
}
