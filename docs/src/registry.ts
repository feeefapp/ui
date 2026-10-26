import { GROUPS, SECTIONS, type DocPage, type DocSection } from './model'

const modules = import.meta.glob<DocPage>('../content/**/page.tsx', { eager: true, import: 'default' })

export const PAGES: DocPage[] = Object.values(modules).sort(
  (a, b) =>
    SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section) ||
    GROUPS.indexOf(a.group ?? 'Actions') - GROUPS.indexOf(b.group ?? 'Actions') ||
    (a.order ?? 100) - (b.order ?? 100) ||
    a.title.localeCompare(b.title)
)

export const pageHref = (page: DocPage) => `/${page.section}/${page.id}`

export function pagesIn(section: DocSection) {
  return PAGES.filter((page) => page.section === section)
}

export type ComponentTab = 'overview' | 'examples' | 'api'

export type Route =
  | { kind: 'home' }
  | { kind: 'index'; section: DocSection }
  | { kind: 'page'; page: DocPage; tab: ComponentTab }
  | { kind: 'missing' }

export function resolveRoute(path: string): Route {
  if (path === '/') return { kind: 'home' }
  const [section, id, tab = 'overview'] = path.slice(1).split('/')
  if (!SECTIONS.some((s) => s.id === section)) return { kind: 'missing' }
  if (!id) return { kind: 'index', section: section as DocSection }
  const page = PAGES.find((p) => p.section === section && p.id === id)
  if (!page || !['overview', 'examples', 'api'].includes(tab)) return { kind: 'missing' }
  return { kind: 'page', page, tab: tab as ComponentTab }
}
