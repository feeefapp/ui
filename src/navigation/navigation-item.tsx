import type { ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { LabButton } from '../ui'
import './navigation-item.css'

export type LabWorkspaceAction = {
  id: string
  label: string
  icon: ReactNode
  active?: boolean
  onSelect(): void
}

export function LabNavigationItem({
  label,
  icon,
  href,
  onSelect,
  active,
  compact,
}: {
  label: string
  icon: ReactNode
  href?: string
  onSelect?(): void
  active?: boolean
  compact: boolean
}) {
  const content = (
    <>
      <span className="lab-navigation-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="lab-navigation-label">{label}</span>
    </>
  )
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {href ? (
          <LabButton
            asChild
            variant="ghost"
            appearance="toolbar"
            className="lab-navigation-item"
            data-compact={compact}
          >
            <a href={href} aria-current={active ? 'page' : undefined} onClick={onSelect}>
              {content}
            </a>
          </LabButton>
        ) : (
          <LabButton
            variant="ghost"
            appearance="toolbar"
            className="lab-navigation-item"
            data-compact={compact}
            aria-current={active ? 'page' : undefined}
            onClick={onSelect}
          >
            {content}
          </LabButton>
        )}
      </Tooltip.Trigger>
      {compact && (
        <Tooltip.Portal>
          <Tooltip.Content
            className="lab-navigation-tooltip"
            side="right"
            sideOffset={8}
            collisionPadding={12}
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  )
}
