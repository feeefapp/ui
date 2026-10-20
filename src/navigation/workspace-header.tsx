'use client'

import type { ReactNode, RefObject } from 'react'
import { FoAnimatedLogo } from '../brand/logo'
import { LabLink, LabToolbar, LabToolbarGroup } from '../ui'
import { useLabI18n } from '../i18n'

/** Shared chrome; pages supply context and commands, never a second navbar skin. */
export function LabWorkspaceHeader({
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
  toggle: ReactNode
  title: string
  detail?: string
  actions?: ReactNode
  tools?: ReactNode
  toolsLabel?: string
  headerRef?: RefObject<HTMLElement | null>
  embedded?: boolean
  /** Where the logo links; each product passes its own home. */
  brandHref?: string
  brandLabel?: string
  /** Short product name after the logo, e.g. `lab`. */
  brandSuffix?: string
}) {
  const { t } = useLabI18n()
  return (
    <header ref={headerRef} className="lab-workspace-header" data-embedded={embedded}>
      <LabToolbar
        label={t('lab.nav.labWorkspace')}
        leading={
          <>
            <LabToolbarGroup
              label={t('lab.nav.workspaceNavigation')}
              className="lab-workspace-header-leading"
            >
              {toggle}
              <LabLink href={brandHref} className="lab-workspace-brand" aria-label={brandLabel}>
                <FoAnimatedLogo
                  width="var(--lab-navigation-logo-width, 100px)"
                  height="var(--lab-navigation-logo-height, 27px)"
                />
                {brandSuffix && <span aria-hidden="true">/ {brandSuffix}</span>}
              </LabLink>
            </LabToolbarGroup>
            <div className="lab-workspace-context">
              <strong>{title}</strong>
              {detail && <span>{detail}</span>}
            </div>
          </>
        }
        trailing={
          <>
            {tools && (
              <LabToolbarGroup
                label={toolsLabel ?? t('lab.nav.viewControls')}
                className="lab-workspace-header-tools"
              >
                {tools}
              </LabToolbarGroup>
            )}
            {actions && (
              <LabToolbarGroup
                label={t('lab.nav.workspaceActions')}
                className="lab-workspace-header-actions"
              >
                {actions}
              </LabToolbarGroup>
            )}
          </>
        }
      />
    </header>
  )
}
