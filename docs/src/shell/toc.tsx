import { ChevronDown, List } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useViewport } from './viewport'

type Entry = { id: string; text: string; level: number }

/**
 * "On this page": the current page's headings, with the one in view highlighted. Pages scroll in
 * the scaffold's content viewport, so that is the observer root.
 */
export function Toc() {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const viewport = useViewport()
  const [entries, setEntries] = useState<Entry[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const root = viewport.current
    if (!root) return
    const collect = () =>
      setEntries(
        [...root.querySelectorAll<HTMLElement>('.docs-page [data-toc]')].map((el) => ({
          id: el.id,
          text: el.textContent?.replace(/^#/, '').trim() ?? '',
          level: Number(el.dataset.toc),
        }))
      )
    collect()
    // Lazy demos and late-loading content change the headings without a navigation.
    const mutations = new MutationObserver(collect)
    mutations.observe(root.querySelector('.docs-page-body') ?? root, { childList: true, subtree: true })
    return () => mutations.disconnect()
  }, [viewport])

  useEffect(() => {
    const root = viewport.current
    if (!root || !entries.length) return
    const reserve = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
    const visible = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) visible.set(r.target.id, r.isIntersecting)
        const first = entries.find((e) => visible.get(e.id))
        if (first) setActive(first.id)
      },
      { root, rootMargin: `-${reserve}px 0px -55% 0px` }
    )
    for (const e of entries) {
      const el = document.getElementById(e.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries, viewport])

  if (entries.length < 2) return null
  return (
    <nav className="docs-toc" aria-label="On this page" data-expanded={expanded}>
      <div className="docs-toc-caption">
        <List size={15} /> On this page
      </div>
      <button
        className="docs-toc-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <List size={16} /> On this page <ChevronDown size={15} />
      </button>
      <ul id={id}>
        {entries.map((e) => (
          <li key={e.id} data-level={e.level}>
            <a href={`#${e.id}`} aria-current={active === e.id ? 'location' : undefined}>
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
