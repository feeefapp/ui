'use client'

import * as React from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { useFloatingBoundary } from '../menu/boundary'
import './tooltip.css'

/**
 * Groups tooltips so moving from one control to the next skips the hover delay. Put one around a
 * toolbar or a screen; `ActionsBar` brings its own.
 */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={350} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  )
}

export type TooltipProps = {
  /** The text. Nothing is wrapped when it is empty. */
  text?: string
  /** Keyboard shortcut shown after the text, e.g. `B` or `⌘Z`. */
  shortcut?: string
  /** Side of the control it opens on. Default `bottom`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** One control that forwards its ref (a kit `Button`/`IconButton`). */
  children: React.ReactElement
}

/**
 * The kit tooltip: a small opaque label shown on hover and keyboard focus, never on touch taps.
 * Needs a `TooltipProvider` above it. The control keeps its own `aria-label`; the tooltip is a
 * visual echo of it, so don't put information only here.
 */
export function Tooltip({ text, shortcut, side = 'bottom', children }: TooltipProps) {
  const boundary = useFloatingBoundary()
  if (!text) return children
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal container={boundary ?? undefined}>
        <RadixTooltip.Content
          className="lab-tooltip"
          side={side}
          sideOffset={8}
          collisionPadding={12}
          collisionBoundary={boundary ?? undefined}
        >
          {text}
          {shortcut && <kbd className="lab-tooltip-shortcut">{shortcut}</kbd>}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
