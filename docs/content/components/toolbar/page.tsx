import { useState } from 'react'
import { ArrowLeft, Download, Plus, SlidersHorizontal } from 'lucide-react'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './toolbar-demo.css'

const controls = {
  search: { type: 'boolean', label: 'Search row', default: false },
  back: { type: 'boolean', label: 'Back button', default: true },
  trailing: { type: 'boolean', label: 'Trailing group', default: true },
  title: { type: 'text', default: 'Products' },
} as const

function PlaygroundToolbar(v: { search: boolean; back: boolean; trailing: boolean; title: string }) {
  const [query, setQuery] = useState('')
  const actions = v.trailing ? (
    <ToolbarGroup label="Actions">
      <IconButton variant="text" appearance="toolbar" aria-label="Export CSV">
        <Download />
      </IconButton>
      <Button variant="filled" appearance="toolbar">
        <Plus />
        Add
      </Button>
    </ToolbarGroup>
  ) : undefined
  if (v.search)
    return (
      <div className="toolbar-demo-surface">
        <ToolbarSearch
          label={`Search ${v.title.toLowerCase()}`}
          value={query}
          onValueChange={setQuery}
          trailing={actions}
        >
          <ToolbarGroup label="Filters">
            <IconButton variant="text" appearance="toolbar" aria-label="Filters">
              <SlidersHorizontal />
            </IconButton>
          </ToolbarGroup>
        </ToolbarSearch>
      </div>
    )
  return (
    <div className="toolbar-demo-surface">
      <Toolbar
        label={v.title}
        leading={
          <ToolbarGroup label="Navigation">
            {v.back && (
              <IconButton variant="text" appearance="toolbar" aria-label="Back">
                <ArrowLeft className="lab-dir-flip" />
              </IconButton>
            )}
            <span className="toolbar-demo-title">{v.title}</span>
          </ToolbarGroup>
        }
        trailing={actions}
      />
    </div>
  )
}

function playgroundCode(v: { search: boolean; back: boolean; trailing: boolean; title: string }) {
  if (v.search)
    return `<ToolbarSearch\n  label="Search ${v.title.toLowerCase()}"\n  value={query}\n  onValueChange={setQuery}${v.trailing ? '\n  trailing={<ToolbarGroup label="Actions">…</ToolbarGroup>}' : ''}\n>\n  <ToolbarGroup label="Filters">…</ToolbarGroup>\n</ToolbarSearch>`
  const leading = `  leading={\n    <ToolbarGroup label="Navigation">\n${v.back ? '      <IconButton variant="text" appearance="toolbar" aria-label="Back">…</IconButton>\n' : ''}      <span>${v.title}</span>\n    </ToolbarGroup>\n  }`
  const trailing = v.trailing
    ? `\n  trailing={\n    <ToolbarGroup label="Actions">\n      <Button variant="filled" appearance="toolbar">Add</Button>\n    </ToolbarGroup>\n  }`
    : ''
  return `<Toolbar\n  label="${v.title}"\n${leading}${trailing}\n/>`
}

function Overview() {
  return (
    <>
      <Playground controls={controls} render={(v) => <PlaygroundToolbar {...v} />} code={playgroundCode} />

      <Section title="Three pieces">
        <Table
          head={['Component', 'Role']}
          rows={[
            [<C>Toolbar</C>, 'Unpainted row. leading at the start, trailing at the end; the space between passes clicks through to the content underneath.'],
            [<C>ToolbarGroup</C>, 'One glass pill around related controls, 44px tall like an iOS bar item (--lab-toolbar-item, at least 44px on touch). It sizes regular children to fill it (38px) and fits their corners to the pill.'],
            [<C>ToolbarSearch</C>, 'A search button that opens into a field inside the same pill, taking the free width of its row.'],
          ]}
        />
        <p>
          A toolbar is chrome that floats over content: the <C>top</C> slot of a <C>ScrollArea</C>, a
          scaffold's app bar, the head of a panel. Only groups are painted, so related controls read as one
          object and unrelated ones stay apart. Controls inside a group use{' '}
          <C>appearance="toolbar"</C> and the default <C>regular</C> size, which drop their own surface,
          take the group's height and share its glass. A filled button keeps its fill. Groups sit{' '}
          <C>--lab-toolbar-gap</C> (12px) apart.
        </p>
        <Code
          code={`<Toolbar
  label="Products"
  leading={
    <ToolbarGroup label="Navigation">
      <IconButton variant="text" appearance="toolbar" aria-label="Back">
        <ArrowLeft className="lab-dir-flip" />
      </IconButton>
      <span>Products</span>
    </ToolbarGroup>
  }
  trailing={
    <ToolbarGroup label="Product actions">
      <Button variant="filled" appearance="toolbar">Add product</Button>
    </ToolbarGroup>
  }
/>`}
        />
        <p>
          When space runs out, <C>leading</C> shrinks and <C>trailing</C> keeps its size. For actions that
          should collapse into a More menu, put a <C>ActionsBar</C> in a group.
        </p>
      </Section>

      <Section title="Search">
        <p>
          <C>ToolbarSearch</C> starts as a search button the size of a toolbar bubble (44px). Opening it moves focus into the field and
          springs the pill to the full width of its row (so use it as the row itself, or give it a
          full-width parent, rather than placing it in a content-sized slot); the controls passed as <C>children</C> (filters,
          sort) hide while it is open and come back when it closes. <C>trailing</C> stays visible
          throughout. Closing clears the query. It starts open when <C>defaultExpanded</C> is set or{' '}
          <C>value</C> is not empty. Use <C>renderInput</C> to swap in your own input (for example a
          combobox with suggestions); spread the props it receives onto it.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Group controls by what they act on: navigation, view, document actions.',
            'Give every group a label; screen readers announce it.',
            'Keep one filled action per toolbar, at the end.',
            'Flip direction-sensitive icons with className="lab-dir-flip".',
          ]}
          dontItems={[
            'Wrap the whole toolbar in one glass group.',
            'Nest a ToolbarGroup in another glass surface.',
            'Use toolbar controls without appearance="toolbar"; they would paint a second surface.',
            'Put the toolbar inside the scrolling content when it should float.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>Toolbar</C> and every <C>ToolbarGroup</C> are <C>role="group"</C> with an{' '}
          <C>aria-label</C>. Tab order is the normal source order; the toolbar does not add roving focus.
          The search trigger has <C>aria-expanded</C> and <C>aria-controls</C>; while closed, the field is
          inert and out of the Tab order, and while open, the hidden <C>children</C> are inert.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves through the controls in order.'],
            ['Enter / Space', 'Opens or closes the search from its button.'],
            ['Escape', 'In the search field: closes it, clears the query and returns focus to the button.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'toolbar',
  title: 'Toolbar',
  group: 'Navigation and layout',
  order: 4,
  summary:
    'Floating rows of grouped controls: glass groups for related commands and a search button that expands into a field.',
  importLine:
    "import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'\nimport { ToolbarSearch } from '@feeef.dev/ui/toolbar-search'",
  source: 'src/toolbar.tsx',
  api: ['Toolbar', 'ToolbarGroup', 'ToolbarSearch'],
  keywords: ['app bar', 'header', 'search', 'button group', 'action bar'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <ToolbarGroup label="Preview">
      <IconButton variant="text" appearance="toolbar" aria-label="Back">
        <ArrowLeft />
      </IconButton>
      <span className="toolbar-demo-title">Products</span>
      <Button variant="filled" appearance="toolbar">
        Add
      </Button>
    </ToolbarGroup>
  ),
})
