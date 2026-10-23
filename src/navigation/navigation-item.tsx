import type { ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Button } from '../ui'
import { useFloatingBoundary } from '../menu/boundary'
import './navigation-item.css'

/** A navigation entry described as data. */
export type WorkspaceAction = {
  id: string
  label: string
  icon: ReactNode
  active?: boolean
  onSelect(): void
}

/**
 * One row of sidebar navigation: icon and label, a link with `href` or a button without. In
 * `compact` (rail) mode only the icon shows and the label moves into a tooltip. Needs a Radix
 * Tooltip.Provider above it in compact mode.
 */
export function NavigationItem({
  label,
  icon,
  href,
  onSelect,
  active,
  compact,
}: {
  /** Visible label; also the accessible name and the rail tooltip. */
  label: string
  /** 20px icon. */
  icon: ReactNode
  /** Renders a link. Without it the item is a button. */
  href?: string
  /** Called on click (also for links, e.g. to route client-side or close a drawer). */
  onSelect?(): void
  /** Marks the current page (`aria-current="page"`) and paints it selected. */
  active?: boolean
  /** Icon-only rail mode with a tooltip label. */
  compact: boolean
}) {
  const boundary = useFloatingBoundary()
  const content = (
    <>
      <span className="lab-navigation-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="lab-navigation-label">{label}</span>
    </>
  )
  const item = href ? (
    <Button
      asChild
      variant="ghost"
      appearance="toolbar"
      className="lab-navigation-item"
      data-compact={compact}
    >
      <a href={href} aria-current={active ? 'page' : undefined} onClick={onSelect}>
        {content}
      </a>
    </Button>
  ) : (
    <Button
      variant="ghost"
      appearance="toolbar"
      className="lab-navigation-item"
      data-compact={compact}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      {content}
    </Button>
  )
  // Only the rail shows a tooltip, so a full-width item works without a Tooltip.Provider.
  if (!compact) return item
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{item}</Tooltip.Trigger>
      <Tooltip.Portal container={boundary ?? undefined}>
        <Tooltip.Content
          className="lab-navigation-tooltip"
          side="right"
          sideOffset={8}
          collisionPadding={12}
          collisionBoundary={boundary ?? undefined}
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
