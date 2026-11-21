import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { BookOpen, ChevronDown, Compass, Folder, Layers, LayoutGrid } from 'lucide-react'
import { FoAnimatedLogo } from '@feeef.dev/ui/brand/logo'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { ToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ThemeSwitch } from '@feeef.dev/ui/theme'
import { ScaffoldSide, ScaffoldToggleButton, useScaffold } from '@feeef.dev/ui/workspace/scaffold'
import { GROUPS, SECTIONS, type DocPage } from '../model'
import { pageHref, pagesIn } from '../registry'
import { Link } from '../router'
import { Customize } from './customize'
import { iconFor } from './icons'
import pkg from '../../../package.json'

const sectionIcons = {
  'get-started': BookOpen,
  guidelines: Compass,
  foundations: Layers,
  components: LayoutGrid,
}

function Branch({
  title,
  icon,
  current,
  initialOpen,
  filtering,
  children,
}: {
  title: string
  icon: ReactNode
  current: string | undefined
  initialOpen?: boolean
  filtering: boolean
  children: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(Boolean(initialOpen || current))
  useEffect(() => {
    if (current) setOpen(true)
  }, [current])
  const expanded = filtering || open
  return (
    <li className="docs-branch">
      <button
        type="button"
        className="docs-branch-toggle"
        aria-controls={id}
        aria-expanded={expanded}
        aria-disabled={filtering || undefined}
        onClick={() => {
          if (!filtering) setOpen(!open)
        }}
      >
        {icon}
        <span>{title}</span>
        <ChevronDown className="docs-branch-chevron" size={14} />
      </button>
      <ul id={id} hidden={!expanded} className="docs-branch-items">
        {children}
      </ul>
    </li>
  )
}

export function DocsSide({ path }: { path: string }) {
  const { sideMode, drawerOpen, setDrawerOpen } = useScaffold()
  const rail = sideMode === 'rail' && !drawerOpen
  const [query, setQuery] = useState('')
  const q = rail ? '' : query.trim().toLowerCase()
  const nav = useRef<HTMLElement>(null)
  const sections = SECTIONS.map((section) => ({
    ...section,
    pages: pagesIn(section.id).filter((p) =>
      `${section.title} ${p.group ?? ''} ${p.title} ${p.summary}`.toLowerCase().includes(q)
    ),
  })).filter((section) => section.pages.length)
  const active = (page: DocPage) => path === pageHref(page) || path.startsWith(pageHref(page) + '/')
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
    )
    return () => cancelAnimationFrame(frame)
  }, [path, rail, drawerOpen])
  const pageItem = (page: DocPage) => {
    const Icon = iconFor(page)
    return (
      <li key={page.id}>
        {rail ? (
          <NavigationItem
            label={page.title}
            icon={<Icon size={18} />}
            href={pageHref(page)}
            active={active(page)}
            compact
            onSelect={() => setDrawerOpen(false)}
          />
        ) : (
          <Link
            to={pageHref(page)}
            className="docs-page-link"
            aria-current={active(page) ? 'page' : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            {page.title}
          </Link>
        )}
      </li>
    )
  }
  return (
    <ScaffoldSide
      className={rail ? 'docs-side docs-side-rail' : 'docs-side'}
      leading={
        <header className="docs-side-head">
          <div className="docs-side-brand" data-rail={rail || undefined}>
            {!rail && (
              <Link
                to="/"
                className="docs-brand"
                aria-label="Feeef UI home"
                onClick={() => setDrawerOpen(false)}
              >
                <FoAnimatedLogo width={84} height={22} />
                <span>UI</span>
                <span className="docs-version">v{pkg.version}</span>
              </Link>
            )}
            {!drawerOpen && <ScaffoldToggleButton />}
          </div>
          {!rail && (
            <ToolbarSearch label="Filter pages" placeholder="Filter pages…" value={query} onValueChange={setQuery} defaultExpanded />
          )}
        </header>
      }
      trailing={
        <footer className="docs-side-foot">
          <ToolbarGroup
            label="Appearance"
            className="docs-side-trailing"
            orientation={rail ? 'vertical' : 'horizontal'}
          >
            <Customize />
            <ThemeSwitch />
          </ToolbarGroup>
        </footer>
      }
    >
      <nav ref={nav} aria-label="Documentation" className="docs-side-nav">
        <ul className="docs-nav-tree">
          {sections.map((section) => {
            if (rail)
              return (
                <li key={section.id}>
                  <ul aria-label={section.title}>{section.pages.map(pageItem)}</ul>
                </li>
              )
            const Icon = sectionIcons[section.id]
            return (
              <Branch
                key={section.id}
                title={section.title}
                icon={<Icon size={17} />}
                filtering={!!q}
                initialOpen={section.id === 'components' || (section.id === 'get-started' && path === '/')}
                current={section.pages.some(active) ? path : undefined}
              >
                {section.id !== 'components'
                  ? section.pages.map(pageItem)
                  : GROUPS.map((group) => {
                      const pages = section.pages.filter((p) => p.group === group)
                      return (
                        pages.length > 0 && (
                          <Branch
                            key={group}
                            title={group}
                            icon={<Folder size={15} />}
                            filtering={!!q}
                            current={pages.some(active) ? path : undefined}
                          >
                            {pages.map(pageItem)}
                          </Branch>
                        )
                      )
                    })}
              </Branch>
            )
          })}
        </ul>
        {!sections.length && <p className="docs-side-empty">No pages match “{query}”.</p>}
      </nav>
    </ScaffoldSide>
  )
}
