import type { ReactNode } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'

export function Heading({
  level = 2,
  id,
  children,
}: {
  level?: 2 | 3
  id: string
  children: ReactNode
}) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag id={id} className="docs-heading" data-toc={level}>
      <a href={`#${id}`} className="docs-heading-anchor" aria-hidden="true" tabIndex={-1}>
        #
      </a>
      {children}
    </Tag>
  )
}

/** Turns a heading into a stable fragment id. */
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** A titled section with an anchor; feeds the "On this page" rail. */
export function Section({
  title,
  id,
  level = 2,
  children,
}: {
  title: string
  id?: string
  level?: 2 | 3
  children: ReactNode
}) {
  return (
    <section className="docs-section">
      <Heading level={level} id={id ?? slug(title)}>
        {title}
      </Heading>
      {children}
    </section>
  )
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="docs-lead">{children}</p>
}

export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: 'note' | 'warning'
  title?: string
  children: ReactNode
}) {
  const Icon = tone === 'warning' ? AlertTriangle : Info
  return (
    <aside className="docs-callout" data-tone={tone}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </aside>
  )
}

/** Side-by-side guidance: what to do and what to avoid. */
export function DoDont({
  doTitle = 'Do',
  dontTitle = "Don't",
  doItems,
  dontItems,
}: {
  doTitle?: string
  dontTitle?: string
  doItems: ReactNode[]
  dontItems: ReactNode[]
}) {
  return (
    <div className="docs-dodont">
      <div data-kind="do">
        <strong>
          <Check size={16} aria-hidden="true" /> {doTitle}
        </strong>
        <ul>
          {doItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
      <div data-kind="dont">
        <strong>
          <X size={16} aria-hidden="true" /> {dontTitle}
        </strong>
        <ul>
          {dontItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Keyboard interaction table for the Accessibility section. */
export function Keys({ rows }: { rows: [keys: string, action: ReactNode][] }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([keys, action]) => (
            <tr key={keys}>
              <td>
                {keys.split(' + ').map((key, i) => (
                  <span key={key}>
                    {i > 0 && ' + '}
                    <kbd>{key}</kbd>
                  </span>
                ))}
              </td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A generic two-or-more column reference table. */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
