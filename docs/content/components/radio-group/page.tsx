import { RadioGroup } from '@feeef.dev/ui/primitives/choice'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const OPTIONS = [
  { value: 'home', label: 'Home delivery', description: 'The courier brings the parcel to the door.' },
  { value: 'desk', label: 'Stop desk', description: 'The customer picks it up at the courier’s office.' },
  { value: 'store', label: 'Store pickup', description: 'Collected from your shop.' },
]

const controls = {
  label: { type: 'text', default: 'Delivery type' },
  description: { type: 'text', default: '' },
  descriptions: { type: 'boolean', label: 'Option descriptions', default: true },
  controlSize: { type: 'select', options: ['small', 'regular'], default: 'regular' },
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
            <RadioGroup
              label={v.label || 'Delivery type'}
              description={v.description || undefined}
              options={v.descriptions ? OPTIONS : OPTIONS.map(({ description: _, ...option }) => option)}
              defaultValue="home"
              controlSize={v.controlSize as 'small' | 'regular'}
              error={v.error ? 'Stop desk is not available in this wilaya.' : undefined}
              required={v.required}
              disabled={v.disabled}
            />
          </div>
        )}
        code={(v) =>
          jsx(
            'RadioGroup',
            {
              label: v.label || 'Delivery type',
              description: v.description || undefined,
              options: '__OPTIONS__',
              value: '__VALUE__',
              onValueChange: '__SET__',
              controlSize: v.controlSize,
              error: v.error ? 'Stop desk is not available in this wilaya.' : undefined,
              required: v.required,
              disabled: v.disabled,
            },
            undefined,
            { controlSize: 'regular' }
          )
            .replace('options="__OPTIONS__"', 'options={deliveryOptions}')
            .replace('value="__VALUE__"', 'value={delivery}')
            .replace('onValueChange="__SET__"', 'onValueChange={setDelivery}')
        }
      />

      <Section title="When to use">
        <p>
          Use a radio group when people choose exactly one of a few options and benefit from seeing
          them all at once: delivery type, payment method, a plan. Two to five options work well,
          especially when each needs a line of explanation. For longer lists use a select; for a
          compact switch between views use a segmented control; to pick several, use checkboxes.
        </p>
      </Section>

      <Section title="Options">
        <p>
          Pass the choices as <C>options</C>, an array of objects. The group renders one native radio
          per option, gives them a shared <C>name</C> (generated when you omit it) and labels the set
          with <C>label</C> as the fieldset legend.
        </p>
        <Table
          head={['Field', 'Type', 'Description']}
          rows={[
            [<C>value</C>, <C>string</C>, 'Submitted with the form and passed to onValueChange. Unique in the group.'],
            [<C>label</C>, <C>ReactNode</C>, 'The option’s visible label.'],
            [<C>description</C>, <C>ReactNode</C>, 'Optional line of detail under the label.'],
            [<C>disabled</C>, <C>boolean</C>, 'Disables this option only.'],
          ]}
        />
        <p>
          The <C>RadioOption</C> type describes one entry. <C>description</C> on the group itself
          adds help text under the legend.
        </p>
      </Section>

      <Section title="Value">
        <p>
          Use <C>value</C> with <C>onValueChange</C> for a controlled group, or{' '}
          <C>defaultValue</C> for an uncontrolled one that a form reset returns to. Pre-select the
          most common or safest option when there is one; with no sensible default, leave it empty
          and mark the group <C>required</C>, which blocks submission until a choice is made and
          adds an asterisk to the legend.
        </p>
      </Section>

      <Section title="Errors">
        <p>
          <C>error</C> prints a message under the options, marks every radio invalid and blocks form
          submission. Clear it when the value changes.
        </p>
      </Section>

      <Section title="A single radio">
        <p>
          <C>Radio</C> is one radio with the same label, description and error props as{' '}
          <C>Checkbox</C>, for layouts the group cannot draw, such as radios inside table rows or
          cards. You then provide the shared <C>name</C>, the checked state and a{' '}
          <C>{'<fieldset>'}</C> with a <C>{'<legend>'}</C> yourself.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Phrase the legend as the question: “Delivery type”, “How will the customer pay?”.',
            'Keep option labels short and parallel; put details in descriptions.',
            'Order options logically, most common first.',
            'Pre-select a default when one option is clearly the usual choice.',
          ]}
          dontItems={[
            'Use radios for more than about six options; use a select.',
            'Use a radio group for on/off; use a switch or a checkbox.',
            'Trigger an action as soon as an option is picked; wait for the form.',
            'Disable every option to show a fixed value; show it as text.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The group is a <C>{'<fieldset>'}</C> whose <C>{'<legend>'}</C> is the label, so screen readers
          announce the question with each option. Radios are native inputs sharing one{' '}
          <C>name</C>: the browser handles keyboard navigation, form submission and reset. The group
          description and error are linked with <C>aria-describedby</C>, and the error is announced
          through a polite live region.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves into the group, to the selected radio (or the first one), then out of the group.'],
            ['Arrow Down', 'Selects the next option.'],
            ['Arrow Right', 'Selects the next option.'],
            ['Arrow Up', 'Selects the previous option.'],
            ['Arrow Left', 'Selects the previous option.'],
            ['Space', 'Selects the focused option.'],
          ]}
        />
        <Callout title="Arrow keys select">
          <p>
            Moving with the arrow keys changes the value, as with any native radio group. Do not run
            side effects in <C>onValueChange</C> that would be costly to trigger while browsing.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'radio-group',
  title: 'Radio group',
  group: 'Selection',
  order: 2,
  summary: 'Radio groups let people pick exactly one option from a short list, each with an optional description.',
  importLine: "import { Radio, RadioGroup } from '@feeef.dev/ui/primitives/choice'",
  source: 'src/primitives/choice.tsx',
  api: ['RadioGroup', 'Radio'],
  keywords: ['radio', 'option', 'single choice', 'fieldset', 'legend', 'RadioOption'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <RadioGroup
      label="Delivery"
      controlSize="small"
      defaultValue="home"
      options={[
        { value: 'home', label: 'Home' },
        { value: 'desk', label: 'Stop desk' },
      ]}
    />
  ),
})
