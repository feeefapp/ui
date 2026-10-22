import { GROUPS, type DocSection } from '../model'
import { Link } from '../router'
import { pageHref, pagesIn } from '../registry'
import { Toc } from '../shell/toc'

/** Components index: every component as a card with a small live preview, by group. */
export function SectionIndex({ section }: { section: DocSection }) {
  const pages = pagesIn(section)
  return (
    <div className="docs-layout">
      <article className="docs-page">
        <header className="docs-page-header">
          <h1>Components</h1>
          <p className="docs-summary">
            Every public component in <code>@feeef.dev/ui</code>, with live examples and generated API
            reference.
          </p>
        </header>
        {GROUPS.map((group) => {
          const inGroup = pages.filter((p) => p.group === group)
          if (!inGroup.length) return null
          return (
            <section key={group} className="docs-section">
              <h2 className="docs-heading" id={group.toLowerCase().replace(/\W+/g, '-')} data-toc={2}>
                {group}
              </h2>
              <ul className="docs-card-grid">
                {inGroup.map((page) => {
                  const Preview = page.Preview
                  return (
                    <li key={page.id}>
                      <Link to={pageHref(page)} className="docs-card">
                        <span className="docs-card-preview" aria-hidden="true" inert>
                          {Preview ? <Preview /> : <span className="docs-card-initial">{page.title[0]}</span>}
                        </span>
                        <span className="docs-card-text">
                          <strong>{page.title}</strong>
                          <span>{page.summary}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </article>
      <Toc />
    </div>
  )
}
