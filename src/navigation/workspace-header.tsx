'use client'

import type { ReactNode, RefObject } from 'react'
import { FoAnimatedLogo } from '../brand/logo'
import { Link, Toolbar, ToolbarGroup } from '../ui'
import { useI18n } from '../i18n'

/**
 * Floating workspace header: a glass group with the sidebar toggle and logo, the page title and
 * detail, then optional `tools` and `actions` groups at the end. Pages supply context and
 * commands, never a second navbar skin.
 */
export function WorkspaceHeader({
  toggle,
  title,
  detail,
  actions,
  tools,
  toolsLabel,
  headerRef,
  embedded = false,
  brandHref = '/',
  brandLabel = 'Feeef',
  brandSuffix,
}: {
  /** The sidebar toggle, shown before the logo (e.g. ScaffoldToggleButton). */
  toggle: ReactNode
  /** Current page title. */
  title: string
  /** Secondary line after the title. */
  detail?: string
  /** Primary page commands, in their own glass group at the end. */
  actions?: ReactNode
  /** View controls (zoom, layout, settings), in a group before `actions`. */
  tools?: ReactNode
  /** Accessible name of the tools group. */
  toolsLabel?: string
  /** Ref to the `<header>` element, e.g. to reserve its height. */
  headerRef?: RefObject<HTMLElement | null>
  /** Sets `data-embedded` on the header, for headers placed inside a panel instead of the page. */
  embedded?: boolean
  /** Where the logo links; each product passes its own home. */
  brandHref?: string
  /** Accessible name of the logo link. */
  brandLabel?: string
  /** Short product name after the logo, e.g. `lab`. */
  brandSuffix?: string
}) {
  const { t } = useI18n()
  return (
    <header ref={headerRef} className="lab-workspace-header" data-embedded={embedded}>
      <Toolbar
        label={t('lab.nav.labWorkspace')}
        leading={
          <>
            <ToolbarGroup
              label={t('lab.nav.workspaceNavigation')}
              className="lab-workspace-header-leading"
            >
              {toggle}
              <Link href={brandHref} className="lab-workspace-brand" aria-label={brandLabel}>
                <FoAnimatedLogo
                  width="var(--lab-navigation-logo-width, 100px)"
                  height="var(--lab-navigation-logo-height, 27px)"
                />
                {brandSuffix && <span aria-hidden="true">/ {brandSuffix}</span>}
              </Link>
            </ToolbarGroup>
            <div className="lab-workspace-context">
              <strong>{title}</strong>
              {detail && <span>{detail}</span>}
            </div>
          </>
        }
        trailing={
          <>
            {tools && (
              <ToolbarGroup
                label={toolsLabel ?? t('lab.nav.viewControls')}
                className="lab-workspace-header-tools"
              >
                {tools}
              </ToolbarGroup>
            )}
            {actions && (
              <ToolbarGroup
                label={t('lab.nav.workspaceActions')}
                className="lab-workspace-header-actions"
              >
                {actions}
              </ToolbarGroup>
            )}
          </>
        }
      />
    </header>
  )
}
