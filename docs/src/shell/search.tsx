import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, Braces, CornerDownLeft, FileText, Search as SearchIcon, X } from 'lucide-react'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabRawInput } from '@feeef.dev/ui/primitives/raw-input'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { API } from '../api'
import { SECTIONS } from '../model'
import { PAGES, pageHref } from '../registry'
import { navigate } from '../router'

type Hit = { id: string; title: string; detail: string; href: string; kind: 'page' | 'prop'; text: string }

function buildIndex(): Hit[] {
  const hits: Hit[] = []
  for (const page of PAGES) {
    const section = SECTIONS.find((s) => s.id === page.section)!.title
    hits.push({
      id: `page:${page.section}/${page.id}`,
      title: page.title,
      detail: page.group ? `${section} · ${page.group}` : section,
      href: pageHref(page),
      kind: 'page',
      text: [page.title, page.summary, page.group, ...(page.keywords ?? []), ...(page.api ?? [])]
        .join(' ')
        .toLowerCase(),
    })
    for (const name of page.api ?? []) {
      for (const prop of API[name]?.props ?? []) {
        hits.push({
          id: `prop:${name}.${prop.name}`,
          title: `${name} · ${prop.name}`,
          detail: prop.description || prop.type,
          href: `${pageHref(page)}/api#api-${name}`,
          kind: 'prop',
          text: `${name} ${prop.name} ${prop.description}`.toLowerCase(),
        })
      }
    }
  }
  return hits
}

/** Ranks title matches first, then pages before props. */
function search(index: Hit[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return index.filter((h) => h.kind === 'page').slice(0, 8)
  return index
    .filter((h) => words.every((w) => h.text.includes(w)))
    .map((h) => ({ h, score: (h.title.toLowerCase().includes(words[0]) ? 0 : 2) + (h.kind === 'page' ? 0 : 1) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map(({ h }) => h)
}

export function Search({ onClose }: { onClose: () => void }) {
  const index = useMemo(buildIndex, [])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const hits = useMemo(() => search(index, query), [index, query])
  const go = (hit: Hit | undefined) => {
    if (!hit) return
    onClose()
    navigate(hit.href)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + hits.length) % Math.max(hits.length, 1))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      go(hits[active])
    }
  }
  // Keep the highlighted result in view as the arrow keys move it.
  useEffect(() => {
    document.getElementById(`hit-${hits[active]?.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, hits])
  return (
    <LabModal
      label="Search the docs"
      close={onClose}
      className="docs-search"
      initialFocusRef={input}
      scrollable
      headerless
      showClose={false}
      fitContent
      scrollOptions={{ edgeGap: 10, contentPadding: 10 }}
      top={
        <div className="docs-search-bar">
          <LabToolbarGroup label="Navigation">
            <LabIconButton variant="text" appearance="toolbar" aria-label="Close search" onClick={onClose}>
              <ArrowLeft size={20} />
            </LabIconButton>
          </LabToolbarGroup>
          <LabToolbarGroup label="Search" className="docs-search-field">
            <SearchIcon size={18} aria-hidden="true" className="docs-search-glyph" />
            <LabRawInput
              ref={input as never}
              type="search"
              aria-label="Search components, guides and props"
              placeholder="Search the docs"
              value={query}
              onValueChange={(next) => {
                setQuery(next)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="docs-search-results"
              aria-activedescendant={hits[active] ? `hit-${hits[active].id}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <LabIconButton
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('')
                  input.current?.focus()
                }}
              >
                <X size={18} />
              </LabIconButton>
            )}
          </LabToolbarGroup>
        </div>
      }
    >
      <ul id="docs-search-results" role="listbox" aria-label="Results" className="docs-search-results">
        {hits.map((hit, i) => (
          <li
            key={hit.id}
            id={`hit-${hit.id}`}
            role="option"
            aria-selected={i === active}
            data-lab-corners
            onMouseMove={() => setActive(i)}
            onClick={() => go(hit)}
          >
            {hit.kind === 'page' ? <FileText size={18} aria-hidden="true" /> : <Braces size={18} aria-hidden="true" />}
            <span>
              <strong>{hit.title}</strong>
              <small>{hit.detail}</small>
            </span>
            {i === active && <CornerDownLeft size={16} aria-hidden="true" />}
          </li>
        ))}
        {!hits.length && <li className="docs-search-empty">No results for “{query}”.</li>}
      </ul>
    </LabModal>
  )
}
