import { useState } from 'react'
import { FilterBar, type FilterOption, type FilterValue } from '@feeef.dev/ui/filter-bar'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './filter-demo.css'

const OPTIONS: FilterOption[] = [
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'returned', label: 'Returned' },
  {
    id: 'wilaya',
    label: 'Wilaya',
    type: 'enum',
    choices: [
      { value: 'alger', label: 'Alger' },
      { value: 'oran', label: 'Oran' },
      { value: 'constantine', label: 'Constantine' },
    ],
  },
  { id: 'created', label: 'Created', type: 'dateRange' },
  { id: 'shipped', label: 'Shipped on', type: 'date' },
]

const controls = {
  pinUnpaid: { type: 'boolean', label: 'Pin Unpaid', default: true },
  pinWilaya: { type: 'boolean', label: 'Pin Wilaya', default: true },
  natural: { type: 'boolean', label: 'Natural language', default: false },
  back: { type: 'boolean', label: 'Back button', default: false },
} as const

function PlaygroundBar(v: { pinUnpaid: boolean; pinWilaya: boolean; natural: boolean; back: boolean }) {
  const [enabled, setEnabled] = useState<string[]>([])
  const [values, setValues] = useState<Record<string, FilterValue>>({})
  const [pinned, setPinned] = useState(
    () => [v.pinUnpaid && 'unpaid', v.pinWilaya && 'wilaya'].filter(Boolean) as string[]
  )
  return (
    <div className="demo-column" style={{ width: '100%' }}>
      <FilterBar
        label="Order filters"
        options={OPTIONS}
        value={enabled}
        onChange={setEnabled}
        values={values}
        onValuesChange={setValues}
        pinned={pinned}
        onPinnedChange={setPinned}
        onNaturalFilter={v.natural ? (text) => OPTIONS.filter((o) => text.toLowerCase().includes(o.label.toLowerCase()) && !o.type).map((o) => o.id) : undefined}
        onBack={v.back ? () => setEnabled([]) : undefined}
      />
      <p className="filter-demo-empty">
        value: [{enabled.join(', ')}] · values:{' '}
        {JSON.stringify(Object.fromEntries(Object.entries(values).filter(([, x]) => x != null)))}
      </p>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => <PlaygroundBar key={`${v.pinUnpaid}-${v.pinWilaya}`} {...v} />}
        code={(v) =>
          `<FilterBar\n  label="Order filters"\n  options={options}\n  value={enabled}\n  onChange={setEnabled}\n  values={values}\n  onValuesChange={setValues}\n  pinned={[${[v.pinUnpaid && "'unpaid'", v.pinWilaya && "'wilaya'"].filter(Boolean).join(', ')}]}\n  onPinnedChange={setPinned}${v.natural ? '\n  onNaturalFilter={parseFilter}' : ''}${v.back ? '\n  onBack={leaveFilteredView}' : ''}\n/>`
        }
      />

      <Section title="Anatomy">
        <p>
          A filter bar is a row of separate glass groups, meant for the <C>top</C> slot of a{' '}
          <C>ScrollArea</C> above a list. From the start:
        </p>
        <ol>
          <li>
            <strong>Back</strong> (<C>onBack</C>, optional): leaves a filtered view.
          </li>
          <li>
            <strong>Catalog button</strong>: opens a searchable list of every option with its current
            value, a pin toggle per row and a <em>Clear values</em> action. Its label says how many filters
            are active.
          </li>
          <li>
            <strong>Describe a filter</strong> (<C>onNaturalFilter</C>, optional): a sparkle button with a
            text field.
          </li>
          <li>
            <strong>Pinned chips</strong> (<C>pinned</C>): one group per pinned filter with its value, a
            clear button and an unpin button. Clicking the chip opens its editor.
          </li>
          <li>
            <strong>Trailing</strong> (<C>trailing</C>, optional): view or list actions at the end.
          </li>
        </ol>
      </Section>

      <Section title="Pins and values are separate">
        <p>
          The bar keeps two independent pieces of state. <strong>Values</strong> are the query: what
          actually filters the list. <strong>Pins</strong> are shortcuts: which filters have a chip in the
          bar. Clearing a chip's value keeps the chip; unpinning a chip keeps its value (it stays visible in
          the catalog and in the active count). Toggling or editing a filter from the catalog also pins it,
          so whatever you just set is in view.
        </p>
        <Table
          head={['State', 'Props', 'Shape']}
          rows={[
            ['On/off filters that are on', <><C>value</C> / <C>onChange</C> (required)</>, <C>string[]</C>],
            ['Every other value', <><C>values</C> / <C>onValuesChange</C></>, <C>{'Record<id, FilterValue>'}</C>],
            ['Pinned chips', <><C>pinned</C> / <C>onPinnedChange</C></>, <C>string[]</C>],
          ]}
        />
        <p>
          <C>values</C> and <C>pinned</C> can be left uncontrolled; control them when they belong in the
          URL or a saved view. A cleared value is reported as <C>null</C>, and an empty range (
          <C>{'{from: "", to: ""}'}</C>) is normalized to <C>null</C>.
        </p>
      </Section>

      <Section title="Option types and editors">
        <Table
          head={['type', 'Value', 'Editor']}
          rows={[
            [<>omitted / <C>boolean</C></>, <><C>true</C>, kept in <C>value</C></>, 'Toggles from the catalog; the chip opens an On / Any menu.'],
            [<C>enum</C>, 'the choice’s value (string)', 'Popover with a searchable choice list.'],
            [<><C>date</C>, <C>time</C>, <C>datetime</C></>, <>ISO string (<C>2026-10-21</C>, <C>09:30</C>, <C>2026-10-21T09:30</C>)</>, 'Popover with a field and Apply.'],
            [<><C>dateRange</C>, <C>timeRange</C>, <C>datetimeRange</C></>, <C>{'{ from, to }'}</C>, 'Dialog with start and end, optional presets.'],
            [<C>custom</C>, 'whatever renderEditor sets', 'Dialog with your renderEditor; formatValue labels the chip.'],
          ]}
        />
        <p>
          Temporal options accept <C>min</C>, <C>max</C>, <C>step</C> (days for dates, seconds for times),
          <C>presets</C> and, for time ranges, <C>allowOvernight</C>. Apply checks the format, steps and
          bounds and that the end is not before the start; your <C>validate</C> runs after that and can block
          Apply with a message.
        </p>
      </Section>

      <Section title="Natural-language filters">
        <p>
          <C>onNaturalFilter</C> is injected: the bar never calls a model itself. It receives the trimmed
          text and returns (or resolves to) the on/off filter ids to enable. The result replaces{' '}
          <C>value</C> and those filters are pinned; an empty list clears every value. Returning an id that is
          not an on/off option, or throwing, shows the error under the field and changes nothing. While the
          promise is pending, Apply shows a spinner.
        </p>
        <Code
          code={`async function parseFilter(text: string) {
  const ids = await api.post('/ai/text/order-filter', { text, options: onOffIds })
  if (!ids.length) throw new Error('Try “unpaid orders in Oran”.')
  return ids
}

<FilterBar … onNaturalFilter={parseFilter} />`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Pin the two or three filters people use daily; the rest live in the catalog.',
            'Write labels as nouns (“Courier”, “Created”) and use description for detail.',
            'Add keywords for synonyms people search for (“refused” → Returned).',
            'Keep the query (values) in the URL so filtered views can be shared.',
          ]}
          dontItems={[
            'Treat pins as filters; an unpinned filter can still be active.',
            'Use a custom editor where an enum or temporal type fits.',
            'Let onNaturalFilter fail silently; throw with a helpful example.',
            'Put the filter bar inside the scrolling content.',
          ]}
        />
        <Callout title="Inside a dialog">
          <p>
            Popovers render into the nearest <C>{'<dialog>'}</C> when the bar is in one, so they stay above
            it, and follow the bar's text direction.
          </p>
        </Callout>
      </Section>

      <Section title="Accessibility">
        <p>
          The bar is a <C>group</C> named by <C>label</C>; each chip is its own named group (“Wilaya
          filter”) with “Edit Wilaya filter”, “Clear Wilaya value” and “Unpin Wilaya” buttons. Opening the
          catalog focuses its search; enum editors focus their choice search. Closing an editor returns focus
          to the chip that opened it, and unpinning the focused chip moves focus to the catalog button.
          Selected choices use <C>aria-pressed</C>, and validation errors use <C>role="alert"</C>.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves between the catalog button, chips and their actions.'],
            ['Enter / Space', 'Opens the focused chip’s editor or toggles a catalog row.'],
            ['Escape', 'Closes the open popover or dialog.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'filter-bar',
  title: 'Filter bar',
  group: 'Navigation and layout',
  order: 5,
  summary:
    'A filter toolbar with a searchable catalog, pinned chips, typed value editors and optional natural-language input.',
  importLine: "import { FilterBar, type FilterOption, type FilterValue } from '@feeef.dev/ui/filter-bar'",
  source: 'src/filter-bar.tsx',
  api: ['FilterBar'],
  keywords: ['filters', 'chips', 'query', 'facets', 'date range', 'pins', 'natural language'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <span className="filter-demo-preview">
      <span>Unpaid · On</span>
      <span>Wilaya · Oran</span>
    </span>
  ),
})
