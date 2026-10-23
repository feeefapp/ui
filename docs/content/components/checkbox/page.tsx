import { Checkbox } from '@feeef.dev/ui/primitives/choice'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const controls = {
  label: { type: 'text', default: 'Send an SMS when the order ships' },
  description: { type: 'text', default: 'Uses one SMS credit per order.' },
  controlSize: { type: 'select', options: ['small', 'regular'], default: 'regular' },
  indeterminate: { type: 'boolean', default: false },
  error: { type: 'boolean', label: 'Error', default: false },
  required: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="demo-column">
            <Checkbox
              label={v.label || undefined}
              aria-label={v.label ? undefined : 'Send an SMS when the order ships'}
              description={v.description || undefined}
              controlSize={v.controlSize as 'small' | 'regular'}
              indeterminate={v.indeterminate}
              error={v.error ? 'Add SMS credits to turn this on.' : undefined}
              required={v.required}
              disabled={v.disabled}
              defaultChecked
            />
          </div>
        )}
        code={(v) =>
          jsx(
            'Checkbox',
            {
              label: v.label || undefined,
              description: v.description || undefined,
              controlSize: v.controlSize,
              indeterminate: v.indeterminate,
              error: v.error ? 'Add SMS credits to turn this on.' : undefined,
              required: v.required,
              disabled: v.disabled,
              checked: '__CHECKED__',
              onCheckedChange: '__SET__',
            },
            undefined,
            { controlSize: 'regular' }
          )
            .replace('checked="__CHECKED__"', 'checked={notify}')
            .replace('onCheckedChange="__SET__"', 'onCheckedChange={setNotify}')
        }
      />

      <Section title="When to use">
        <p>
          Use a checkbox to turn one option on or off inside a form that is submitted later, or to
          pick any number of items from a list: order tags, product variants to export, rows to
          delete. For a setting that applies immediately, use a switch; to pick exactly one of
          several options, use a radio group.
        </p>
        <p>
          <C>Checkbox</C> is a native <C>{'<input type="checkbox">'}</C> wrapped in its label, so
          the whole label is the click target and forms, <C>name</C>, <C>value</C>,{' '}
          <C>required</C> and reset work as usual. Use <C>checked</C> with{' '}
          <C>onCheckedChange</C> (it receives the boolean) for a controlled checkbox, or{' '}
          <C>defaultChecked</C> for an uncontrolled one.
        </p>
      </Section>

      <Section title="Label and description">
        <p>
          <C>label</C> says what turning it on does. <C>description</C> adds one line of detail under
          it, such as a cost or a consequence, and is linked as the checkbox’s description. Both
          accept rich content, but keep links out of the label: clicking anywhere on the label
          toggles the box.
        </p>
      </Section>

      <Section title="Indeterminate">
        <p>
          A “select all” checkbox over a list is <C>indeterminate</C> when only some items are
          selected: it shows a dash and reports <C>aria-checked="mixed"</C>. It is derived state, so
          compute it from the list on every render; clicking the box fires{' '}
          <C>onCheckedChange</C>, and your handler decides whether that selects or clears everything.
        </p>
      </Section>

      <Section title="Errors">
        <p>
          <C>error</C> prints a message under the label, marks the checkbox invalid and blocks form
          submission until it clears. Use it for things like terms that must be accepted, together
          with <C>required</C>, which also adds an asterisk to the label.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Write labels as positive statements: “Send an SMS when the order ships”.',
            'Stack checkboxes vertically, one option per line.',
            'Use a fieldset with a legend when several checkboxes answer one question.',
            'Leave optional checkboxes unchecked by default, especially ones that cost money.',
          ]}
          dontItems={[
            'Use negative labels like “Don’t send emails”.',
            'Use a checkbox for a setting that saves instantly; that is a switch.',
            'Put links or buttons inside the label.',
            'Use a single checkbox to choose between two named options; use radios.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The label and description are linked to the native input with <C>aria-labelledby</C> and{' '}
          <C>aria-describedby</C>; the error is added to the description and announced through a
          polite live region. Without a visible <C>label</C>, give the checkbox an{' '}
          <C>aria-label</C>, for example “Select order #10234” in a table row.
        </p>
        <Keys
          rows={[
            ['Space', 'Toggles the checkbox.'],
            ['Tab', 'Moves to the next checkbox; each one is its own tab stop.'],
          ]}
        />
        <Callout title="Groups">
          <p>
            Wrap related checkboxes in a <C>{'<fieldset>'}</C> with a <C>{'<legend>'}</C>, so screen
            readers announce the question before each option.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'checkbox',
  title: 'Checkbox',
  group: 'Selection',
  order: 1,
  summary: 'Checkboxes turn an option on or off in a form, or pick any number of items from a list.',
  importLine: "import { Checkbox } from '@feeef.dev/ui/primitives/choice'",
  source: 'src/primitives/choice.tsx',
  api: ['Checkbox'],
  keywords: ['check', 'tick', 'select all', 'indeterminate', 'mixed', 'terms'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Checkbox label="Confirmed" defaultChecked />
      <Checkbox label="Shipped" />
    </div>
  ),
})
