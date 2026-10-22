import { useState } from 'react'
import { LabDateField, LabTemporalField } from '@feeef.dev/ui/primitives/temporal-field'
import type { LabTemporalType, LabTemporalValue } from '@feeef.dev/ui/filters/temporal'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

const TYPES = ['date', 'time', 'datetime', 'dateRange', 'timeRange', 'datetimeRange'] as const
const VARIANTS = ['outlined', 'filled', 'tonal', 'elevated', 'text'] as const

const WRAPPER: Record<(typeof TYPES)[number], string> = {
  date: 'LabDateField',
  time: 'LabTimeField',
  datetime: 'LabDateTimeField',
  dateRange: 'LabDateRangeField',
  timeRange: 'LabTimeRangeField',
  datetimeRange: 'LabDateTimeRangeField',
}

const controls = {
  type: { type: 'select', options: TYPES, default: 'date' },
  hint: { type: 'text', default: 'Delivery date' },
  variant: { type: 'select', options: VARIANTS, default: 'outlined' },
  controlSize: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
  labelStyle: { type: 'select', options: ['outlined', 'inside'], default: 'outlined' },
  clearable: { type: 'boolean', default: true },
  required: { type: 'boolean', default: false },
  readOnly: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
} as const

/** Holds the playground's value; resets when the type changes, since the value shape changes. */
function PlaygroundField(props: {
  type: LabTemporalType
  hint: string
  variant: (typeof VARIANTS)[number]
  controlSize: 'regular' | 'compact'
  labelStyle: 'outlined' | 'inside'
  clearable: boolean
  required: boolean
  readOnly: boolean
  disabled: boolean
}) {
  const [value, setValue] = useState<LabTemporalValue>(null)
  return (
    <div className="demo-column">
      <LabTemporalField {...props} value={value} onValueChange={setValue} />
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PlaygroundField
            key={v.type}
            type={v.type as LabTemporalType}
            hint={v.hint}
            variant={v.variant as (typeof VARIANTS)[number]}
            controlSize={v.controlSize as 'regular' | 'compact'}
            labelStyle={v.labelStyle as 'outlined' | 'inside'}
            clearable={v.clearable}
            required={v.required}
            readOnly={v.readOnly}
            disabled={v.disabled}
          />
        )}
        code={(v) =>
          jsx(
            WRAPPER[v.type as (typeof TYPES)[number]],
            {
              hint: v.hint,
              variant: v.variant,
              controlSize: v.controlSize,
              labelStyle: v.labelStyle,
              clearable: v.clearable,
              required: v.required,
              readOnly: v.readOnly,
              disabled: v.disabled,
              value: '{value}',
              onValueChange: '{setValue}',
            },
            undefined,
            { variant: 'outlined', controlSize: 'regular', labelStyle: 'outlined' }
          ).replace(/="\{(\w+)\}"/g, '={$1}')
        }
      />

      <Section title="When to use">
        <p>
          Use a date or time field whenever a person picks a day, a time or a span of either: a
          delivery date, a callback time, a reporting period, a courier’s working hours. The field
          looks and sizes like a text field, but opens a picker built for choosing rather than typing:
          preset chips first, then calendars and number-field times, with typed entry one click away.
        </p>
        <p>
          For a filter panel or a custom container where you already own the trigger and the Apply
          button, use the picker body on its own: <Link to="/components/temporal-filter-editor">Temporal filter editor</Link>.
        </p>
      </Section>

      <Section title="Choosing a field">
        <p>
          Six components share one implementation. Pick the wrapper that names the value; it types{' '}
          <C>value</C> and <C>onValueChange</C> for you. <C>LabTemporalField</C> takes the same props
          plus <C>type</C>, for when the kind of value is decided at runtime.
        </p>
        <Table
          head={['Component', 'Value', 'Example']}
          rows={[
            [<C>LabDateField</C>, <C>string | null</C>, <C>"2026-10-21"</C>],
            [<C>LabTimeField</C>, <C>string | null</C>, <C>"09:30"</C>],
            [<C>LabDateTimeField</C>, <C>string | null</C>, <C>"2026-10-21T09:30"</C>],
            [<C>LabDateRangeField</C>, <C>{'{ from, to } | null'}</C>, <C>{'{ from: "2026-10-01", to: "2026-10-31" }'}</C>],
            [<C>LabTimeRangeField</C>, <C>{'{ from, to } | null'}</C>, <C>{'{ from: "09:00", to: "17:00" }'}</C>],
            [<C>LabDateTimeRangeField</C>, <C>{'{ from, to } | null'}</C>, <C>{'{ from: "2026-10-21T08:00", to: "2026-10-21T20:00" }'}</C>],
          ]}
        />
        <p>
          Values are always local wall-clock ISO strings, the same format as the native{' '}
          <C>{'<input type="date|time|datetime-local">'}</C>. They carry no time zone: converting to
          UTC or to a query parameter is your code’s job. Either end of a range may be an empty
          string, which means “open”; a range with both ends empty becomes <C>null</C>.
        </p>
      </Section>

      <Section title="How picking works">
        <p>
          The field is a full-size button. Clicking it, or pressing <kbd>ArrowDown</kbd>, opens the
          picker on a copy of the current value. A <strong>date</strong> is complete in one tap: pick
          the day (or a preset) and the field closes with it. Times, datetimes and ranges have parts, so
          they commit on <strong>Apply</strong>; dismissing the picker keeps the old value.{' '}
          <strong>Clear</strong> empties the value, and <C>clearable</C> adds a clear button to the field
          itself.
        </p>
        <Table
          head={['Part', 'What it does']}
          rows={[
            ['Preset chips', 'One-click values such as Today, Last 7 days or Morning, always visible: a column beside wide range calendars, a scrolling row on phones. They come from temporalPresets(type) unless you pass presets; presets outside min, max or step are hidden.'],
            ['Calendar', 'One heading bubble: previous, the month title, next. The title opens a month grid for jumping months and years. Ranges show two months side by side when there is room, painted as one continuous band; the first click sets the start, the second the end.'],
            ['Start and end', 'Ranges show a segmented control (Start · Oct 5 / End · Any) that says which end the next click sets.'],
            ['Times', 'Hour and minute number fields: drag to scrub, type, or use the arrow keys. Minutes snap to step; seconds appear when step is under 60. Ranges get a start row and an end row.'],
            ['Typed entry', '“Type a date” reveals native inputs for typing a value directly.'],
          ]}
        />
        <p>
          Single values open in a popover under the field that hugs its content. Ranges need more room, so they open in a{' '}
          <Link to="/components/modal">modal</Link> with the actions docked at the bottom. On phones every picker opens as a dialog. Inside a{' '}
          <C>{'<dialog>'}</C>, the popover portals into that dialog so it stays in the top layer.
        </p>
      </Section>

      <Section title="Bounds, steps and validation">
        <p>
          <C>min</C> and <C>max</C> use the value’s own format and disable the days outside them.{' '}
          <C>step</C> is in days for dates and in seconds for times and datetimes, counted from{' '}
          <C>min</C>. <C>allowOvernight</C> lets a time range end after midnight, so{' '}
          <C>{'{ from: "20:00", to: "02:00" }'}</C> is valid.
        </p>
        <p>The field checks, in order:</p>
        <ol>
          <li><C>required</C>: an empty value shows <C>requiredMessage</C>.</li>
          <li>The built-in rules from <C>validateTemporal</C>: a real date or time, <C>step</C>, <C>min</C>/<C>max</C>, and the end not before the start.</li>
          <li>Your <C>validator</C>, for domain rules such as “no deliveries on Friday”.</li>
        </ol>
        <p>
          A failing draft keeps the picker open with the message above the actions. On the field
          itself, errors appear after blur by default; set <C>validationMode</C> to{' '}
          <C>change</C> or <C>submit</C> to change that. Pass <C>error</C> for server feedback; it
          wins over the built-in message. <C>onValidationChange</C> reports the current message, or{' '}
          <C>null</C>.
        </p>
      </Section>

      <Section title="In a form">
        <p>
          Give the field a <C>name</C> and it submits with its form. A single value submits as its ISO
          string. A range submits as JSON under <C>name</C>, and <C>rangeNames</C> adds plain{' '}
          <C>from</C>/<C>to</C> entries for servers that expect two fields. When the form is
          submitted, <C>required</C> and the validation rules run, and an invalid field takes focus.
          Form reset clears the error state.
        </p>
        <Code
          code={`<form action="/orders/export">
  <LabDateRangeField
    hint="Orders placed"
    name="period"
    rangeNames={{ from: 'placed_from', to: 'placed_to' }}
    value={period}
    onValueChange={setPeriod}
  />
</form>
// period=… JSON, placed_from=2026-10-01, placed_to=2026-10-31`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            <>Use the wrapper that names the value (<C>LabDateRangeField</C>), not a generic field with a string.</>,
            'Give every field a hint that names what is being chosen: “Delivery date”, not “Date”.',
            <>Set <C>min</C>/<C>max</C> so impossible days can’t be picked, instead of only rejecting them after.</>,
            'Offer presets that match the task: Today and Tomorrow for scheduling, Last 30 days for reports.',
            'Convert to UTC or your API format at the edge, from the ISO value.',
          ]}
          dontItems={[
            'Parse the displayed text; it is localized and only for reading.',
            <>Use <C>placeholder</C> as the only label; add <C>aria-label</C> if there is no hint.</>,
            'Put two separate date fields where a range field fits.',
            <>Rely on <C>readOnly</C> to protect a value; validate on the server as well.</>,
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The trigger is a native button with <C>aria-haspopup="dialog"</C> and{' '}
          <C>aria-expanded</C>. Its accessible name is the hint (or <C>aria-label</C>), and the
          formatted value, supporting text and error are linked through <C>aria-describedby</C>.
          Invalid fields set <C>aria-invalid</C>; required and read-only fields set{' '}
          <C>aria-required</C> and <C>aria-readonly</C>. Closing the picker returns focus to the field.
        </p>
        <p>
          Calendar days are buttons named with the full date (“Wednesday, October 21, 2026”); the
          selected days are pressed, today is <C>aria-current="date"</C>, and only one day is a Tab
          stop. Presets and range endpoints are toggle buttons with <C>aria-pressed</C>.
        </p>
        <Keys
          rows={[
            ['Enter', 'Opens the picker from the field.'],
            ['Escape', 'Closes the picker without changing the value.'],
            ['ArrowLeft', 'Calendar: previous day.'],
            ['ArrowRight', 'Calendar: next day.'],
            ['ArrowUp', 'Calendar: same day last week.'],
            ['ArrowDown', 'On the field, opens the picker. Calendar: same day next week.'],
            ['Home', 'Calendar: first day of the week.'],
            ['End', 'Calendar: last day of the week.'],
            ['PageUp', 'Calendar: same day last month.'],
            ['PageDown', 'Calendar: same day next month.'],
          ]}
        />
        <Callout title="Right-to-left">
          <p>
            Field chrome mirrors under <C>dir="rtl"</C> and the picker follows the field’s direction.
            Arrow keys keep their calendar meaning (left is the previous day).
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'date-time-fields',
  title: 'Date and time fields',
  group: 'Date and time',
  order: 1,
  summary:
    'Fields for a date, a time, a datetime or a range of each, with presets, calendars, bounds and native form values.',
  importLine:
    "import { LabDateField, LabDateRangeField } from '@feeef.dev/ui/primitives/temporal-field'",
  source: 'src/primitives/temporal-field.tsx',
  api: [
    'LabTemporalField',
    'LabDateField',
    'LabTimeField',
    'LabDateTimeField',
    'LabDateRangeField',
    'LabTimeRangeField',
    'LabDateTimeRangeField',
  ],
  keywords: ['date picker', 'time picker', 'calendar', 'range', 'datetime', 'period', 'schedule'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 240 }}>
      <LabDateField hint="Delivery date" value="2026-10-21" onValueChange={() => {}} />
    </div>
  ),
})
