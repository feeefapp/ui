import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { SECTIONS, type DocPage } from '../model'
import { Link } from '../router'
import { pageHref, PAGES, type Route } from '../registry'
import { Code } from '../blocks/code'
import { Example } from '../blocks/example'
import { ApiTable } from '../blocks/api-table'
import { Toc } from '../shell/toc'

const REPO = 'https://github.com/feeefapp/ui/blob/main/'

export function DocPageView({ route }: { route: Extract<Route, { kind: 'page' }> }) {
  const { page, tab } = route
  const section = SECTIONS.find((s) => s.id === page.section)!
  const { Overview } = page
  return (
    <div className="docs-layout">
      <article className="docs-page">
        <header className="docs-page-header">
          <p className="docs-breadcrumb">
            <Link to={page.section === 'components' ? '/components' : pageHref(page)}>{section.title}</Link>
            {page.group && <span> / {page.group}</span>}
          </p>
          <h1>
            {page.title}
            {page.status === 'studio' && <span className="docs-chip">Studio</span>}
          </h1>
          <p className="docs-summary">{page.summary}</p>
          {page.status === 'studio' && (
            <p className="docs-studio-note">
              Studio components are Lab product widgets that currently ship in the kit. They are documented
              for completeness and will move to their own package; avoid them in new apps.
            </p>
          )}
          {(page.importLine || page.source) && (
            <div className="docs-page-meta">
              {page.importLine && <Code code={page.importLine} title="Import" />}
              {page.source && (
                <LabButton variant="text" controlSize="compact" asChild>
                  <a href={REPO + page.source} target="_blank" rel="noreferrer">
                    View source <ExternalLink size={16} />
                  </a>
                </LabButton>
              )}
            </div>
          )}
        </header>
        <div className="docs-page-body">
          {tab === 'overview' && <Overview />}
          {tab === 'examples' && page.examples?.map((example) => <Example key={example.id} example={example} />)}
          {tab === 'api' && page.api?.map((name) => <ApiTable key={name} name={name} />)}
        </div>
        <PageFooter page={page} />
      </article>
      <Toc key={`${page.section}/${page.id}/${tab}`} />
    </div>
  )
}

/** Previous / next within the same section, like the end of a book chapter. */
function PageFooter({ page }: { page: DocPage }) {
  const siblings = PAGES.filter((p) => p.section === page.section)
  const i = siblings.indexOf(page)
  const prev = siblings[i - 1]
  const next = siblings[i + 1]
  if (!prev && !next) return null
  return (
    <nav className="docs-pager" aria-label="More pages">
      {prev ? (
        <LabButton variant="outlined" asChild>
          <Link to={pageHref(prev)} data-dir="prev">
            <ArrowLeft size={18} />
            <span>
              <small>Previous</small>
              {prev.title}
            </span>
          </Link>
        </LabButton>
      ) : (
        <span />
      )}
      {next && (
        <LabButton variant="outlined" asChild>
          <Link to={pageHref(next)} data-dir="next">
            <span>
              <small>Next</small>
              {next.title}
            </span>
            <ArrowRight size={18} />
          </Link>
        </LabButton>
      )}
    </nav>
  )
}
