import { useState, type ReactNode } from 'react'
import { Code as CodeIcon } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import type { DocExample } from '../model'
import { Code, CopyButton } from './code'
import { Heading } from './prose'
import { useDocsSettings } from '../settings'

/** A live demo on a quiet stage, with its source one click away. */
export function Example({ example, headingLevel = 2 }: { example: DocExample; headingLevel?: 2 | 3 }) {
  const [open, setOpen] = useState(false)
  const { Demo } = example
  return (
    <section className="docs-example" aria-labelledby={`example-${example.id}`}>
      <Heading level={headingLevel} id={`example-${example.id}`}>
        {example.title}
      </Heading>
      {example.description && <p className="docs-example-description">{example.description}</p>}
      <div className="docs-example-card">
        <Stage>
          <Demo />
        </Stage>
        <Toolbar
          label={`${example.title} example`}
          className="docs-example-bar"
          leading={null}
          trailing={
            <ToolbarGroup label="Example actions">
              <Button
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
              >
                <CodeIcon size={18} />
                {open ? 'Hide code' : 'Show code'}
              </Button>
              <CopyButton text={example.source} label="Copy example code" />
            </ToolbarGroup>
          }
        />
        {open && <Code code={example.source} copy={false} className="docs-example-code" />}
      </div>
    </section>
  )
}

/** The neutral area demos render on, in the direction of the reader's demo language. */
export function Stage({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'start' }) {
  const { dir, settings } = useDocsSettings()
  return (
    <div className="docs-stage" data-align={align} dir={dir} lang={settings.locale}>
      {children}
    </div>
  )
}
