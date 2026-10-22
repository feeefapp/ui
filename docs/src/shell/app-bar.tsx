import { useEffect, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Search } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { FoAnimatedLogo } from '@feeef.dev/ui/brand/logo'
import { Presence } from '@feeef.dev/ui/motion'
import { ScaffoldAppBar, ScaffoldToggleButton, useScaffold } from '@feeef.dev/ui/workspace/scaffold'
import { Link, navigate } from '../router'
import { pageHref, type ComponentTab, type Route } from '../registry'
import { Customize } from './customize'
import { useViewport } from './viewport'

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const TABS: { value: ComponentTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'examples', label: 'Examples' },
  { value: 'api', label: 'API' },
]

/** The views a page actually has (components without examples or API skip those). */
export function tabsFor(route: Route) {
  if (route.kind !== 'page') return []
  const { page } = route
  return TABS.filter(
    (t) => t.value === 'overview' || (t.value === 'examples' ? page.examples?.length : page.api?.length)
  )
}

/** Switches a component page between Overview, Examples and API: a view picker, so a segmented control. */
function PageTabs({ route }: { route: Route }) {
  if (route.kind !== 'page') return null
  const tabs = tabsFor(route)
  if (tabs.length < 2) return null
  const href = pageHref(route.page)
  return (
    <SegmentedControl<ComponentTab>
      label={`${route.page.title} documentation`}
      appearance="plain"
      value={route.tab}
      options={tabs}
      onChange={(tab) => navigate(tab === 'overview' ? href : `${href}/${tab}`)}
    />
  )
}

function SearchButton({ onSearch }: { onSearch: () => void }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <IconButton variant="text" appearance="toolbar" aria-label="Search the docs" onClick={onSearch}>
          <Search size={20} />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="lab-navigation-tooltip" sideOffset={8}>
          Search · {mac ? '⌘' : 'Ctrl'} K
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/**
 * True once the page's large title has scrolled under the floating bar, like an iOS large title
 * collapsing into the navigation bar. Re-attaches whenever the page changes.
 */
function useTitleScrolledAway(path: string) {
  const viewport = useViewport()
  const [away, setAway] = useState(false)
  useEffect(() => {
    const root = viewport.current
    const heading = root?.querySelector('.docs-page h1')
    setAway(false)
    if (!root || !heading) return
    const reserve = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
    const observer = new IntersectionObserver(
      ([entry]) =>
        setAway(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + reserve),
      { root, rootMargin: `-${reserve}px 0px 0px 0px` }
    )
    observer.observe(heading)
    return () => observer.disconnect()
  }, [viewport, path])
  return away
}

/**
 * Floating app bar over the content, in Liquid Glass spirit: chrome stays out of the way until the
 * layout gets smaller. With the full sidebar, the bar holds only the page views and search. When the
 * scaffold is minimal (rail, hidden, phone drawer) the logo moves up into a leading bubble with the
 * menu toggle (and search on phones), and on phones the page views drop to a floating bottom dock
 * (DocsViewsDock). The small page title appears once the large one scrolls away.
 */
export function DocsAppBar({
  route,
  title,
  path,
  onSearch,
}: {
  route: Route
  title: string
  path: string
  onSearch: () => void
}) {
  const { compact, sideMode } = useScaffold()
  const minimal = compact || sideMode !== 'expanded'
  // In rail mode the sidebar keeps its own toggle.
  const toggle = compact ? 'drawer' : sideMode === 'hidden' ? 'restore' : null
  const titleAway = useTitleScrolledAway(path)
  const views = !compact && tabsFor(route).length > 1 && (
    <ToolbarGroup label="Page views" className="docs-app-bar-tabs">
      <PageTabs route={route} />
    </ToolbarGroup>
  )
  return (
    <ScaffoldAppBar
      className="docs-app-bar"
      leading={
        minimal ? (
          <ToolbarGroup label="Navigation" className="docs-app-bar-brand">
            {toggle && <ScaffoldToggleButton action={toggle} />}
            <Link to="/" className="docs-brand docs-app-bar-logo" aria-label="Feeef UI home">
              <FoAnimatedLogo width={64} height={18} />
              <span>UI</span>
            </Link>
            {compact && <SearchButton onSearch={onSearch} />}
          </ToolbarGroup>
        ) : undefined
      }
      trailing={
        <>
          {views}
          {compact ? (
            <ToolbarGroup label="Appearance" className="docs-app-bar-tools">
              <Customize />
            </ToolbarGroup>
          ) : (
            <ToolbarGroup label="Tools" className="docs-app-bar-tools">
              <SearchButton onSearch={onSearch} />
            </ToolbarGroup>
          )}
        </>
      }
    >
      {route.kind !== 'home' && !compact && (
        <Presence
          open={titleAway}
          render={(state) => (
            <ToolbarGroup label="Page title" className="docs-app-bar-title" data-state={state}>
              <span>{title}</span>
            </ToolbarGroup>
          )}
        />
      )}
    </ScaffoldAppBar>
  )
}

/** Compact layouts: the page views float at the bottom, like an iOS tab bar. */
export function DocsViewsDock({ route }: { route: Route }) {
  const { compact } = useScaffold()
  if (!compact || tabsFor(route).length < 2) return null
  return (
    <Dock label="Page views" className="docs-views-dock">
      <PageTabs route={route} />
    </Dock>
  )
}
