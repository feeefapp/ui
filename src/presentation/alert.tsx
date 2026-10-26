'use client'

import * as React from 'react'
import { cn } from '../utils'
import { Button, type ButtonVariant } from '../primitives/button'
import { PresentationHost, usePresented } from './host'
import { usePopMotion } from './motion'
import { alertActionOrder, alertActionsFit, type AlertActionRole } from './alert-model'
import '../glass/glass.css'
import '../menu/menu.css'
import './presentation.css'

export type { AlertActionRole } from './alert-model'

export type AlertAction = {
  /** The button text: name the outcome (“Cancel order”, “Keep order”), never “OK”. */
  label: string
  /**
   * `cancel` backs out (also run by Escape; it sits first in a row and last in a stack),
   * `primary` is the one main action (filled), `destructive` deletes or loses something (tinted
   * danger). No role: any other choice.
   */
  role?: AlertActionRole
  /** Runs when the action is chosen. Return `false` to keep the alert open (to show an error). */
  onAction?: () => void | boolean
  /** Disables the button. */
  disabled?: boolean
}

export type AlertProps = {
  /** Shows the alert. Keep it mounted and toggle this so it can fade out. */
  open: boolean
  /** Called with `false` once an action is chosen (or Escape runs the cancel action). */
  onOpenChange: (open: boolean) => void
  /** The question or the fact, as a short sentence (“Cancel order #10482?”). Also its name. */
  title: string
  /** One or two sentences: what happens, and whether it can be undone. */
  message?: React.ReactNode
  /** The choices, in reading order. Two that fit sit side by side; otherwise they stack. */
  actions: readonly AlertAction[]
  /** A field the decision needs (a reason, a confirmation word), between the message and the actions. */
  children?: React.ReactNode
  /** Focused when the alert opens. Default: the cancel action, or the last action. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Focused after it closes, when the control that opened it may be gone. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
  /** Renders inside this positioned element instead of the top layer (previews). */
  container?: HTMLElement | null
  className?: string
}

const variantOf = (role: AlertActionRole | undefined): ButtonVariant =>
  role === 'primary' ? 'filled' : role === 'destructive' ? 'destructive' : 'elevated'

/**
 * A small centred decision, like an iOS alert: a title, a message and capsule buttons on the thick
 * glass the menus use, over a dimmed page. Choosing an action closes it; Escape runs the cancel
 * action. Use it for confirmations (“Delete order?”); use `Modal` for anything with a form.
 */
export function Alert(props: AlertProps) {
  const { mounted, exited } = usePresented(props.open)
  if (!mounted) return null
  return <AlertPresentation {...props} onExited={exited} />
}

function AlertPresentation({
  open,
  onOpenChange,
  title,
  message,
  actions,
  children,
  initialFocusRef,
  returnFocusRef,
  container,
  className,
  onExited,
}: AlertProps & { onExited: () => void }) {
  const surface = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const row = React.useRef<HTMLDivElement>(null)
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([])
  const titleId = React.useId()
  const messageId = React.useId()
  const [sideBySide, setSideBySide] = React.useState(actions.length === 2)
  usePopMotion(open, surface, scrim, onExited)

  // Two actions sit side by side while both labels fit half the row; otherwise they stack.
  React.useLayoutEffect(() => {
    const element = row.current
    if (!element) return
    const measure = () => {
      const widths = buttons.current.slice(0, actions.length).filter(Boolean).map((button) => {
        const label = button!.querySelector<HTMLElement>('.lab-alert-action-label')
        const style = getComputedStyle(button!)
        return (
          (label?.offsetWidth ?? button!.scrollWidth) +
          parseFloat(style.paddingInlineStart) +
          parseFloat(style.paddingInlineEnd) +
          parseFloat(style.borderInlineStartWidth) +
          parseFloat(style.borderInlineEndWidth)
        )
      })
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0
      const next = alertActionsFit(widths, element.clientWidth, gap)
      setSideBySide((previous) => (previous === next ? previous : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [actions.map((action) => action.label).join('\u0000')])

  const order = alertActionOrder(
    actions.map((action) => action.role),
    sideBySide
  )
  const cancelIndex = actions.findIndex((action) => action.role === 'cancel')
  const choose = (index: number) => {
    if (!open) return
    if (actions[index].onAction?.() === false) return
    onOpenChange(false)
  }
  // Focus the safe choice: cancel when there is one, otherwise the last (main) action.
  const fallbackFocus = React.useRef<HTMLElement | null>(null)
  const focusIndex = cancelIndex >= 0 ? cancelIndex : actions.length - 1

  return (
    <PresentationHost
      kind="alert"
      role="alertdialog"
      label={title}
      labelledBy={titleId}
      describedBy={message != null ? messageId : undefined}
      container={container}
      initialFocusRef={initialFocusRef ?? fallbackFocus}
      returnFocusRef={returnFocusRef}
      onEscape={() => {
        if (cancelIndex >= 0) choose(cancelIndex)
      }}
    >
      <div ref={scrim} className="lab-presentation-scrim" aria-hidden="true" />
      <div ref={surface} className={cn('lab-alert', className)} data-layout={sideBySide ? 'row' : 'stack'}>
        <div className="lab-alert-text">
          <h2 id={titleId} className="lab-alert-title">
            {title}
          </h2>
          {message != null && (
            <div id={messageId} className="lab-alert-message">
              {message}
            </div>
          )}
        </div>
        {children != null && <div className="lab-alert-content">{children}</div>}
        <div ref={row} className="lab-alert-actions">
          {order.map((index) => {
            const action = actions[index]
            return (
              <Button
                key={index}
                ref={(element: HTMLButtonElement | null) => {
                  buttons.current[index] = element
                  if (index === focusIndex) fallbackFocus.current = element
                }}
                variant={variantOf(action.role)}
                className="lab-alert-action"
                data-role={action.role}
                disabled={action.disabled}
                onClick={() => choose(index)}
              >
                <span className="lab-alert-action-label">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </PresentationHost>
  )
}
