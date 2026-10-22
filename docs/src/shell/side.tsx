import { useState } from 'react'
import { FoAnimatedLogo } from '@feeef.dev/ui/brand/logo'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { LabThemeSwitch } from '@feeef.dev/ui/theme'
import { LabScaffoldSide, LabScaffoldToggleButton, useLabScaffold } from '@feeef.dev/ui/workspace/scaffold'
import { GROUPS, SECTIONS } from '../model'
import { pageHref, pagesIn } from '../registry'
import { Link } from '../router'
import { Customize } from './customize'
import { iconFor } from './icons'
import pkg from '../../../package.json'

/**
 * The docs sidebar, built like any Feeef workspace sidebar: brand and toggle on top, a page filter,
 * navigation items by section and group, appearance controls pinned at the bottom.
 */
export function DocsSide({ path }: { path: string }) {
  const { sideMode, drawerOpen, setDrawerOpen } = useLabScaffold()
  const rail = sideMode === 'rail' && !drawerOpen
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (text: string) => !q || text.toLowerCase().includes(q)
  let shown = 0
  return (
    <LabScaffoldSide
      className="docs-side"
      leading={
        <div className="docs-side-leading">
          <div className="docs-side-brand" data-rail={rail || undefined}>
            {!rail && (
              <Link to="/" className="docs-brand" aria-label="Feeef UI home">
                <FoAnimatedLogo width={84} height={22} />
                <span>UI</span>
                <span className="docs-version">v{pkg.version}</span>
              </Link>
            )}
            {!drawerOpen && <LabScaffoldToggleButton />}
          </div>
          {!rail && <LabToolbarSearch label="Filter pages" value={query} onValueChange={setQuery} />}
        </div>
      }
      trailing={
        <LabToolbarGroup label="Appearance" className="docs-side-trailing">
          <Customize />
          <LabThemeSwitch />
        </LabToolbarGroup>
      }
    >
      <nav aria-label="Documentation" className="docs-side-nav">
        {SECTIONS.map((section) => {
          const pages = pagesIn(section.id).filter((p) => matches(`${p.title} ${p.summary} ${p.group ?? ''}`))
          if (!pages.length) return null
          shown += pages.length
          const groups =
            section.id === 'components'
              ? GROUPS.map((group) => ({ group, pages: pages.filter((p) => p.group === group) })).filter(
                  (g) => g.pages.length
                )
              : [{ group: null as string | null, pages }]
          return (
            <section key={section.id} aria-label={section.title}>
              {!rail && <h2 className="docs-side-heading">{section.title}</h2>}
              {groups.map(({ group, pages }) => (
                <div key={group ?? section.id} className="docs-side-group">
                  {group && !rail && <h3 className="docs-side-subheading">{group}</h3>}
                  {pages.map((page) => {
                    const href = pageHref(page)
                    const Icon = iconFor(page)
                    return (
                      <LabNavigationItem
                        key={page.id}
                        label={page.title}
                        icon={<Icon size={20} />}
                        href={href}
                        active={path === href || path.startsWith(href + '/')}
                        compact={rail}
                        onSelect={() => setDrawerOpen(false)}
                      />
                    )
                  })}
                </div>
              ))}
            </section>
          )
        })}
        {shown === 0 && <p className="docs-side-empty">No pages match “{query}”.</p>}
      </nav>
    </LabScaffoldSide>
  )
}
