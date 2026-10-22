import { useState } from 'react'
import { ArrowLeft, Download, Plus, SlidersHorizontal } from 'lucide-react'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
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
    <LabToolbarGroup label="Actions">
      <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Export CSV">
        <Download />
      </LabIconButton>
      <LabButton variant="filled" appearance="toolbar" controlSize="compact">
        <Plus />
        Add
      </LabButton>
    </LabToolbarGroup>
  ) : undefined
  if (v.search)
    return (
      <div className="toolbar-demo-surface">
        <LabToolbarSearch
          label={`Search ${v.title.toLowerCase()}`}
          value={query}
          onValueChange={setQuery}
          trailing={actions}
        >
          <LabToolbarGroup label="Filters">
            <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Filters">
              <SlidersHorizontal />
            </LabIconButton>
          </LabToolbarGroup>
        </LabToolbarSearch>
      </div>
    )
  return (
    <div className="toolbar-demo-surface">
      <LabToolbar
        label={v.title}
        leading={
          <LabToolbarGroup label="Navigation">
            {v.back && (
              <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Back">
                <ArrowLeft className="lab-dir-flip" />
              </LabIconButton>
            )}
            <span className="toolbar-demo-title">{v.title}</span>
          </LabToolbarGroup>
        }
        trailing={actions}
      />
    </div>
  )
}

function playgroundCode(v: { search: boolean; back: boolean; trailing: boolean; title: string }) {
  if (v.search)
    return `<LabToolbarSearch\n  label="Search ${v.title.toLowerCase()}"\n  value={query}\n  onValueChange={setQuery}${v.trailing ? '\n  trailing={<LabToolbarGroup label="Actions">…</LabToolbarGroup>}' : ''}\n>\n  <LabToolbarGroup label="Filters">…</LabToolbarGroup>\n</LabToolbarSearch>`
  const leading = `  leading={\n    <LabToolbarGroup label="Navigation">\n${v.back ? '      <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Back">…</LabIconButton>\n' : ''}      <span>${v.title}</span>\n    </LabToolbarGroup>\n  }`
  const trailing = v.trailing
    ? `\n  trailing={\n    <LabToolbarGroup label="Actions">\n      <LabButton variant="filled" appearance="toolbar" controlSize="compact">Add</LabButton>\n    </LabToolbarGroup>\n  }`
    : ''
  return `<LabToolbar\n  label="${v.title}"\n${leading}${trailing}\n/>`
}

function Overview() {
  return (
    <>
      <Playground controls={controls} render={(v) => <PlaygroundToolbar {...v} />} code={playgroundCode} />

      <Section title="Three pieces">
        <Table
          head={['Component', 'Role']}
          rows={[
            [<C>LabToolbar</C>, 'Unpainted row. leading at the start, trailing at the end; the space between passes clicks through to the content underneath.'],
            [<C>LabToolbarGroup</C>, 'One glass pill around related controls. It sizes children to 40px (44px on touch and narrow screens) and fits their corners to the pill.'],
            [<C>LabToolbarSearch</C>, 'A search button that opens into a field inside the same pill, taking the free width of its row.'],
          ]}
        />
        <p>
          A toolbar is chrome that floats over content: the <C>top</C> slot of a <C>LabScrollArea</C>, a
          scaffold's app bar, the head of a panel. Only groups are painted, so related controls read as one
          object and unrelated ones stay apart. Controls inside a group use{' '}
          <C>appearance="toolbar"</C> and <C>controlSize="compact"</C>, which drop their own surface and
          share the group's glass. A filled button keeps its fill.
        </p>
        <Code
          code={`<LabToolbar
  label="Products"
  leading={
    <LabToolbarGroup label="Navigation">
      <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Back">
        <ArrowLeft className="lab-dir-flip" />
      </LabIconButton>
      <span>Products</span>
    </LabToolbarGroup>
  }
  trailing={
    <LabToolbarGroup label="Product actions">
      <LabButton variant="filled" appearance="toolbar" controlSize="compact">Add product</LabButton>
    </LabToolbarGroup>
  }
/>`}
        />
        <p>
          When space runs out, <C>leading</C> shrinks and <C>trailing</C> keeps its size. For actions that
          should collapse into a More menu, put a <C>LabActionsBar</C> in a group.
        </p>
      </Section>

      <Section title="Search">
        <p>
          <C>LabToolbarSearch</C> starts as a 40px search button. Opening it moves focus into the field and
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
            'Nest a LabToolbarGroup in another glass surface.',
            'Use toolbar controls without appearance="toolbar"; they would paint a second surface.',
            'Put the toolbar inside the scrolling content when it should float.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>LabToolbar</C> and every <C>LabToolbarGroup</C> are <C>role="group"</C> with an{' '}
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
    "import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'\nimport { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'",
  source: 'src/toolbar.tsx',
  api: ['LabToolbar', 'LabToolbarGroup', 'LabToolbarSearch'],
  keywords: ['app bar', 'header', 'search', 'button group', 'action bar'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <LabToolbarGroup label="Preview">
      <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Back">
        <ArrowLeft />
      </LabIconButton>
      <span className="toolbar-demo-title">Products</span>
      <LabButton variant="filled" appearance="toolbar" controlSize="compact">
        Add
      </LabButton>
    </LabToolbarGroup>
  ),
})
