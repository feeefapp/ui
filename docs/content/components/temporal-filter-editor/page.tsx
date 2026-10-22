import { useState } from 'react'
import { LabTemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'
import type { LabTemporalType, LabTemporalValue } from '@feeef.dev/ui/filters/temporal'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

const TYPES = ['dateRange', 'date', 'time', 'datetime', 'timeRange', 'datetimeRange'] as const

const controls = {
  type: { type: 'select', options: TYPES, default: 'dateRange' },
  bounded: { type: 'boolean', label: 'Limit to this year', default: false },
  allowOvernight: { type: 'boolean', label: 'Allow overnight', default: false },
} as const

function PlaygroundEditor({
  type,
  bounded,
  allowOvernight,
}: {
  type: LabTemporalType
  bounded: boolean
  allowOvernight: boolean
}) {
  const [value, setValue] = useState<LabTemporalValue>(null)
  const year = new Date().getFullYear()
  const bounds = bounded && !type.startsWith('time')
  return (
    <div className="demo-wide">
      <LabTemporalFilterEditor
        config={{
          type,
          allowOvernight,
          ...(bounds && {
            min: type.startsWith('datetime') ? `${year}-01-01T00:00` : `${year}-01-01`,
            max: type.startsWith('datetime') ? `${year}-12-31T23:59` : `${year}-12-31`,
          }),
        }}
        value={value}
        onChange={setValue}
      />
      <p>
        <C>{`value = ${JSON.stringify(value)}`}</C>
      </p>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PlaygroundEditor
            key={v.type}
            type={v.type as LabTemporalType}
            bounded={v.bounded}
            allowOvernight={v.allowOvernight}
          />
        )}
        code={(v) => {
          const config = [
            `type: '${v.type}'`,
            v.bounded && !v.type.startsWith('time') ? "min: '2026-01-01', max: '2026-12-31'" : '',
            v.allowOvernight ? 'allowOvernight: true' : '',
          ]
            .filter(Boolean)
            .join(', ')
          return `<LabTemporalFilterEditor\n  config={{ ${config} }}\n  value={value}\n  onChange={setValue}\n/>`
        }}
      />

      <Section title="When to use">
        <p>
          <C>LabTemporalFilterEditor</C> is the picker body behind the{' '}
          <Link to="/components/date-time-fields">date and time fields</Link>, without the field, the
          popover or the Apply button. Use it when you own the container: a filter panel, a
          “Filter orders by date” dialog, a sidebar, or a popover opened from a chip. For a form
          field, use <C>LabDateField</C> and its siblings instead; they wrap this editor and add the
          trigger, draft handling and validation.
        </p>
        <p>
          In a dialog, use <C>LabTemporalDialog</C> instead of putting this editor in a{' '}
          <C>LabModal</C>. It floats the start/end switch and the presets in one top bar, scrolls the
          calendars and times, and ends with one action bar (Cancel · Clear · Apply), with no title bar
          and no close button. That keeps the dialog two levels deep. Building your own layout? Take the
          parts: <C>useLabTemporalEditor</C> with <C>LabTemporalEdges</C>, <C>LabTemporalPresets</C>{' '}
          (<C>layout="bar"</C>) and <C>LabTemporalBody</C>.
        </p>
      </Section>

      <Section title="What it shows">
        <p>
          The editor adapts to <C>config.type</C>. It is fully controlled: every click calls{' '}
          <C>onChange</C> with the new value, and nothing is validated or committed for you.
        </p>
        <Table
          head={['Part', 'Shown for', 'Behavior']}
          rows={[
            ['Preset chips', 'Every type', 'Always visible: a wrapping row, a column beside wide calendars, a scrolling row when narrow. Defaults to temporalPresets(type); presets that fail validateTemporal(config) are hidden. Choosing one calls onPick.'],
            ['Start and end', 'Date ranges', 'A segmented control showing both ends; it chooses which end the next calendar click sets.'],
            ['Calendars', 'Dates and datetimes', 'One month, or two consecutive months when the container is wide enough. min and max disable days.'],
            ['Times', 'Times and datetimes', 'Hour and minute number fields (drag, type, arrows), plus seconds when step is under 60.'],
            ['Typed entry', 'Every type', '“Type a date” reveals native inputs for typing. The footer prop puts your own actions at the end of that row.'],
          ]}
        />
        <p>
          The editor sizes to its container, so give it a bounded width. Inside a scrollable dialog or
          popover, wrap it in a <C>LabScrollArea</C> and dock the Apply action at the bottom, as the
          examples do.
        </p>
      </Section>

      <Section title="Helpers">
        <p>
          Three pure functions come with the editor. Import them from{' '}
          <C>@feeef.dev/ui/filters/temporal</C>; they work on the same local ISO values and run on the
          server too.
        </p>

        <Section title="temporalPresets(type, now?)" id="temporal-presets" level={3}>
          <p>
            Returns the default presets for a type, computed in local wall-clock time from{' '}
            <C>now</C> (default: the current time). Pass a fixed <C>now</C> in tests, or to anchor the
            presets to another day. The labels are English; map them if you translate the UI.
          </p>
          <Table
            head={['Type', 'Presets']}
            rows={[
              [<C>date</C>, 'Today, Yesterday'],
              [<C>time</C>, 'Now, 09:00, 17:00'],
              [<C>datetime</C>, 'Now, Tomorrow at 09:00'],
              [<C>dateRange</C>, 'All time (null), Today, Yesterday, Last 7 / 14 / 30 days, This month, Last month'],
              [<C>timeRange</C>, 'Morning (09:00–12:00), Afternoon (13:00–17:00)'],
              [<C>datetimeRange</C>, 'Last 24 hours, Today'],
            ]}
          />
          <Code
            code={`import { temporalPresets } from '@feeef.dev/ui/filters/temporal'

const presets = [
  ...temporalPresets('dateRange').filter((p) => p.label !== 'All time'),
  { label: 'Since launch', value: { from: '2026-03-01', to: '' } },
]

<LabTemporalFilterEditor config={{ type: 'dateRange', presets }} value={value} onChange={setValue} />`}
          />
        </Section>

        <Section title="validateTemporal(config, value)" id="validate-temporal" level={3}>
          <p>
            Checks a value against a config and returns an English error message, or <C>null</C>{' '}
            when it is valid. <C>null</C> values are always valid; requiring a value is up to you.
            The checks, in order:
          </p>
          <ol>
            <li>Format: a real calendar date and a 24-hour time, in the shape the type expects (<C>2026-02-30</C> fails).</li>
            <li><C>step</C>, counted from <C>min</C>: days for dates, seconds for times and datetimes.</li>
            <li><C>min</C> and <C>max</C>, for every end of a range.</li>
            <li>Order: a range’s end must not be before its start, unless the type is <C>timeRange</C> with <C>allowOvernight</C>.</li>
          </ol>
          <Code
            code={`import { validateTemporal } from '@feeef.dev/ui/filters/temporal'

validateTemporal({ type: 'date', min: '2026-10-01' }, '2026-09-30')
// "Use a value on or after 2026-10-01."

validateTemporal({ type: 'timeRange' }, { from: '20:00', to: '02:00' })
// "The end time must be on or after the start time."

validateTemporal({ type: 'timeRange', allowOvernight: true }, { from: '20:00', to: '02:00' })
// null`}
          />
        </Section>

        <Section title="readTemporalForm(type, formData)" id="read-temporal-form" level={3}>
          <p>
            The editor renders hidden inputs, <C>date</C> for a single value and <C>from</C>/
            <C>to</C> for a range, so it works inside a plain <C>{'<form>'}</C>.{' '}
            <C>readTemporalForm</C> reads them back into a value, turning an empty range into{' '}
            <C>null</C>. Use one editor per form, since the input names are fixed.
          </p>
          <Code
            code={`<form
  onSubmit={(event) => {
    event.preventDefault()
    const value = readTemporalForm('dateRange', new FormData(event.currentTarget))
    const error = validateTemporal({ type: 'dateRange' }, value)
    if (!error) applyFilter(value)
  }}
>
  <LabTemporalFilterEditor config={{ type: 'dateRange' }} value={draft} onChange={setDraft} />
</form>`}
          />
        </Section>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Keep a draft in state and commit it on an explicit Apply, like the fields do.',
            <>Run <C>validateTemporal</C> before applying and show its message next to the action.</>,
            'Put Apply in a dock at the bottom of the container so it stays visible while the calendar scrolls.',
            <>Pass <C>config.presets</C> that match the screen: “Last 30 days” for analytics, “Today” for dispatch.</>,
          ]}
          dontItems={[
            'Apply every click immediately to an expensive query; a range takes two clicks.',
            'Squeeze it into a fixed tiny box; it needs about 280px, and two months need more.',
            'Use it as a form field. Use LabDateRangeField, which adds the trigger and validation.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          Presets and range endpoints are toggle buttons with <C>aria-pressed</C> inside labelled
          groups. Each month is a table labelled with the month name; days are buttons named with the
          full date, the selected ones pressed and today marked <C>aria-current="date"</C>. Only one
          day per month is a Tab stop. The month title is a button that opens a month grid. Times are
          number fields named “Hour” and “Minute” inside a group named after the row (“Start time”).
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves between preset chips, the start/end switch, the month heading, the day grid and the time fields.'],
            ['ArrowLeft', 'Previous day.'],
            ['ArrowRight', 'Next day.'],
            ['ArrowUp', 'Same day last week.'],
            ['ArrowDown', 'Same day next week.'],
            ['Home', 'First day of the week.'],
            ['End', 'Last day of the week.'],
            ['PageUp', 'Same day last month.'],
            ['PageDown', 'Same day next month.'],
            ['Enter', 'Selects the focused day or preset.'],
          ]}
        />
        <Callout title="Give the container a name">
          <p>
            The editor has no heading of its own. Label the popover or dialog that holds it (“Filter
            orders by date”) so screen readers announce what is being chosen.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'temporal-filter-editor',
  title: 'Temporal filter editor',
  group: 'Date and time',
  order: 2,
  summary:
    'The date and time picker body on its own, for filter panels and custom containers, with helpers for presets and validation.',
  importLine: "import { LabTemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'",
  source: 'src/filters/temporal-editor.tsx',
  api: ['LabTemporalFilterEditor'],
  keywords: ['calendar', 'date filter', 'presets', 'temporalPresets', 'validateTemporal', 'readTemporalForm', 'range'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 18px)', gap: 4, fontSize: 11, textAlign: 'center' }} aria-hidden="true">
      {Array.from({ length: 21 }, (_, i) => (
        <span
          key={i}
          style={{
            borderRadius: 6,
            padding: '2px 0',
            background:
              i === 9 || i === 13
                ? 'var(--lab-primary)'
                : i > 9 && i < 13
                  ? 'color-mix(in srgb, var(--lab-primary) 18%, transparent)'
                  : undefined,
            color: i === 9 || i === 13 ? 'var(--lab-on-primary)' : undefined,
          }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  ),
})
