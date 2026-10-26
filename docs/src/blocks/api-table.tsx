import { API, DART_API, inheritedLabel, type ApiComponent } from '../api'
import { useDocsSettings } from '../settings'
import { C } from './code'
import { Heading } from './prose'

function Type({ value }: { value: string }) {
  return <code className="docs-type">{value.replace(/"/g, "'")}</code>
}

/**
 * One component's props, generated from its TypeScript source, or from the Flutter twin's Dart
 * source when the reader picked Flutter (constructor parameters, their types and doc comments).
 */
export function ApiTable({ name }: { name: string }) {
  const { settings } = useDocsSettings()
  const flutter = settings.code === 'flutter'
  const doc: ApiComponent | undefined = (flutter ? DART_API : API)[name]
  if (!doc) {
    return (
      <section className="docs-api">
        <Heading id={`api-${name}`}>{name}</Heading>
        <p className="docs-muted">
          {flutter ? `${name} has no Flutter widget of the same name.` : `No props found for ${name}.`}
        </p>
      </section>
    )
  }
  return (
    <section className="docs-api" aria-labelledby={`api-${name}`}>
      <Heading id={`api-${name}`}>{doc.name}</Heading>
      {doc.description && <p>{doc.description}</p>}
      {doc.props.length ? (
        <div className="docs-table-wrap">
          <table className="docs-table docs-props">
            <thead>
              <tr>
                <th scope="col">{flutter ? 'Parameter' : 'Prop'}</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {doc.props.map((prop) => (
                <tr key={prop.name}>
                  <td data-label="Prop">
                    <code className="docs-prop-name">{prop.name}</code>
                    {prop.required && <span className="docs-required">required</span>}
                  </td>
                  <td data-label="Type">
                    <Type value={prop.type} />
                  </td>
                  <td data-label="Default">
                    {prop.defaultValue ? <Type value={prop.defaultValue} /> : <span className="docs-muted">—</span>}
                  </td>
                  <td data-label="Description">
                    {prop.description || <span className="docs-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="docs-muted">This component takes no props of its own.</p>
      )}
      {doc.inherits.length > 0 && (
        <p className="docs-inherits">
          Also accepts{' '}
          {doc.inherits.map((group, i) => (
            <span key={group.from}>
              {i > 0 && (i === doc.inherits.length - 1 ? ' and ' : ', ')}
              <span title={`${group.count} props from ${group.from}`}>{inheritedLabel(group.from)}</span>
            </span>
          ))}
          , passed to the underlying element.
        </p>
      )}
      <p className="docs-source">
        Source: <C>{doc.source}</C>
      </p>
    </section>
  )
}
