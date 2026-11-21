import { useEffect, useRef, useState, type MouseEvent } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Provider } from '@feeef.dev/ui/provider'
import { Scaffold } from '@feeef.dev/ui/workspace/scaffold'
import { DocsSettingsProvider, useDocsSettings } from './settings'
import { navigate, usePath } from './router'
import { resolveRoute, type Route } from './registry'
import { DocsSide } from './shell/side'
import { DocsAppBar, DocsViewsDock } from './shell/app-bar'
import { Search } from './shell/search'
import { ViewportContext } from './shell/viewport'
import { HomePage } from './pages/home'
import { SectionIndex } from './pages/section-index'
import { DocPageView } from './pages/doc-page'
import { NotFound } from './pages/not-found'

export function App() {
  return (
    <DocsSettingsProvider>
      <Themed />
    </DocsSettingsProvider>
  )
}

function Themed() {
  const { settings, dir } = useDocsSettings()
  return (
    <Provider theme={settings.theme} i18n={{ locale: settings.locale, dir }}>
      <Tooltip.Provider delayDuration={300}>
        <Shell />
      </Tooltip.Provider>
    </Provider>
  )
}

const titleOf = (route: Route) =>
  route.kind === 'page'
    ? route.page.title
    : route.kind === 'index'
      ? 'Components'
      : route.kind === 'home'
        ? 'Feeef UI'
        : 'Not found'

/** Same-origin links route in the app; modified clicks, new tabs and other origins stay native. */
function routeLinks(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return
  const link = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
  if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin) return
  if (link.pathname === location.pathname && link.hash) return // same-page fragment: native scroll
  event.preventDefault()
  navigate(link.pathname + link.hash)
}

function Shell() {
  const { settings: { glassSidebar } } = useDocsSettings()
  const path = usePath()
  const route = resolveRoute(path)
  const title = titleOf(route)
  const [searchOpen, setSearchOpen] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable]')
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', open)
    return () => window.removeEventListener('keydown', open)
  }, [])

  // New page: go to the fragment if there is one, otherwise to the top of the content viewport.
  useEffect(() => {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (target) target.scrollIntoView()
    else viewport.current?.scrollTo({ top: 0 })
    document.title = route.kind === 'home' ? 'Feeef UI' : `${title} · Feeef UI`
  }, [path]) // route and title are derived from path

  return (
    // The kit puts the demo language's direction on <html>; the docs text itself stays English LTR.
    <div className="docs-app" dir="ltr" lang="en" onClickCapture={routeLinks}>
      <ViewportContext.Provider value={viewport}>
        <Scaffold
          className="docs-scaffold"
          dir="ltr"
          glassSidebar={glassSidebar}
          contentViewportRef={viewport}
          contentLabel={title}
          drawerLabel="Documentation navigation"
          side={<DocsSide path={path} />}
          appBar={<DocsAppBar route={route} title={title} path={path} onSearch={() => setSearchOpen(true)} />}
          bottom={<DocsViewsDock route={route} />}
        >
          <div className="docs-content">
            {route.kind === 'home' && <HomePage />}
            {route.kind === 'index' && <SectionIndex section={route.section} />}
            {route.kind === 'page' && <DocPageView route={route} />}
            {route.kind === 'missing' && <NotFound />}
          </div>
        </Scaffold>
      </ViewportContext.Provider>
      {searchOpen && <Search onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
