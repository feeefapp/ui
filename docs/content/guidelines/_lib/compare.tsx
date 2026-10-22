import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { Stage } from '../../../src/blocks/example'
import './compare.css'

/**
 * A live right-vs-wrong pair: two real renders side by side, each with a one-line reason.
 * Guidelines show the mistake instead of only describing it.
 */
export function Compare({
  good,
  bad,
  goodNote,
  badNote,
}: {
  good: ReactNode
  bad: ReactNode
  goodNote: ReactNode
  badNote: ReactNode
}) {
  return (
    <div className="docs-compare">
      <figure data-kind="do">
        <Stage>{good}</Stage>
        <figcaption>
          <Check size={16} aria-hidden="true" />
          <span>
            <strong>Do</strong> {goodNote}
          </span>
        </figcaption>
      </figure>
      <figure data-kind="dont">
        <Stage>{bad}</Stage>
        <figcaption>
          <X size={16} aria-hidden="true" />
          <span>
            <strong>Don’t</strong> {badNote}
          </span>
        </figcaption>
      </figure>
    </div>
  )
}

/** A numbered principle: statement, the reason behind it, and how it shows up in practice. */
export function Principle({
  n,
  title,
  id,
  why,
  how,
  children,
}: {
  n: number
  title: string
  id: string
  why: ReactNode
  how: ReactNode[]
  children?: ReactNode
}) {
  return (
    <section className="docs-principle" aria-labelledby={id}>
      <h2 id={id} className="docs-heading" data-toc={2}>
        <span className="docs-principle-n" aria-hidden="true">
          {n}
        </span>
        {title}
      </h2>
      <p className="docs-principle-why">{why}</p>
      <ul className="docs-principle-how">
        {how.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {children}
    </section>
  )
}
