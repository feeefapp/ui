import { Link } from '../router'

export function NotFound() {
  return (
    <article className="docs-page">
      <header className="docs-page-header">
        <h1>Page not found</h1>
        <p className="docs-summary">
          This page doesn’t exist. Try search (<kbd>/</kbd>) or go to the <Link to="/components">components</Link>.
        </p>
      </header>
    </article>
  )
}
