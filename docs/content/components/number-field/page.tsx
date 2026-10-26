import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const controls = {
  label: { type: 'text', default: 'Delivery fee' },
  unit: { type: 'text', default: 'DA' },
  bounded: { type: 'boolean', label: 'Min and max (fill)', default: true },
  max: { type: 'number', min: 100, max: 5000, step: 100, default: 1500 },
  step: { type: 'select', options: ['1', '10', '50', '0.5'], default: '50' },
  steppers: { type: 'boolean', default: true },
  variant: { type: 'select', options: ['elevated', 'outlined', 'tonal', 'filled', 'text'], default: 'elevated' },
  controlSize: { type: 'select', options: ['small', 'regular'], default: 'regular' },
  disabled: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="demo-column">
            <NumberField
              key={`${v.bounded}-${v.max}-${v.step}`}
              label={v.label}
              unit={v.unit || undefined}
              min={0}
              max={v.bounded ? v.max : undefined}
              step={Number(v.step)}
              defaultValue={400}
              steppers={v.steppers}
              variant={v.variant as 'elevated'}
              controlSize={v.controlSize as 'small' | 'regular'}
              disabled={v.disabled}
            />
          </div>
        )}
        code={(v) =>
          jsx(
            'NumberField',
            {
              label: v.label,
              unit: v.unit || undefined,
              min: { expr: '0' },
              max: v.bounded ? { expr: String(v.max) } : undefined,
              step: { expr: v.step },
              value: { expr: 'fee' },
              onValueChange: { expr: 'setFee' },
              steppers: v.steppers ? undefined : { expr: 'false' },
              variant: v.variant,
              controlSize: v.controlSize,
              disabled: v.disabled,
            },
            undefined,
            { variant: 'elevated', controlSize: 'regular' }
          )
        }
      />

      <Section title="How it works">
        <p>
          A number field puts the label and the value in one control, the way Blender does. It is
          faster than a text box for values people tweak: drag to scrub, click to type exact numbers.
        </p>
        <Table
          head={['Do this', 'What happens']}
          rows={[
            ['Drag sideways (mouse, pen or finger)', <>Scrubs the value. With <C>min</C> and <C>max</C>, the field’s width covers the whole range; without them, every 8px is one <C>step</C>. Dragging starts from the current value, so it never jumps.</>],
            ['Hold Shift while dragging', 'Ten times slower, for precise values.'],
            ['Click without dragging', 'Turns the field into an input with the value selected. Enter or leaving the field saves, Escape cancels.'],
            ['Type an expression', <>Arithmetic is evaluated safely: <C>1250*3</C>, <C>(4500+900)/2</C>, <C>2000*15%</C>. Commas work as decimals, and Arabic-Indic digits are accepted.</>],
            ['Use the ‹ › steppers', <>One <C>step</C> each. They appear on hover and keyboard focus, and stay visible on touch screens.</>],
          ]}
        />
        <Callout title="Vertical swipes still scroll">
          <p>
            On touch screens the field only claims horizontal drags (<C>touch-action: pan-y</C>), so a
            page full of fields still scrolls normally.
          </p>
        </Callout>
      </Section>

      <Section title="Bounded and unbounded">
        <p>
          Set both <C>min</C> and <C>max</C> when the range is meaningful (percentages, ratings, sizes):
          the field shows a fill and behaves as a slider (<C>role="slider"</C>). Leave <C>max</C> out for
          open-ended amounts like prices; it behaves as a spin button (<C>role="spinbutton"</C>) and
          scrubs by steps.
        </p>
      </Section>

      <Section title="Values, events and forms">
        <p>
          <C>onValueChange</C> fires on every change, including each drag move, so use it for live
          state. <C>onValueCommit</C> fires once a change is final (release, step, Enter); use it for
          saves and requests. <C>defaultValue</C> is also what Backspace resets to, and what a form
          reset restores. Give the field a <C>name</C> to submit it with a form.
        </p>
        <Code
          code={`const [fee, setFee] = useState(400)

<NumberField
  label="Delivery fee"
  unit="DA"
  min={0}
  step={50}
  value={fee}
  onValueChange={setFee}
  onValueCommit={(value) => saveStore({ deliveryFee: value })}
/>`}
        />
        <p>
          Need the parser elsewhere? <C>parseNumberExpression(text)</C> is exported too; it returns{' '}
          <C>null</C> for anything that isn’t arithmetic and never evaluates code.
        </p>
      </Section>

      <Section title="Validation and help">
        <p>
          Number fields validate like text fields. <C>validator(value)</C> returns an actionable message
          or nothing; <C>validationMode</C> shows it after the field first loses focus (<C>blur</C>,
          the default), on every <C>change</C>, or only on <C>submit</C>. <C>error</C> shows a message
          now, such as one from the server. Either one paints the edge red, replaces{' '}
          <C>supportingText</C> under the field and blocks the form: the web field carries its
          validity on the input that submits it, and Flutter’s takes part in <C>FieldForm</C>.
        </p>
        <p>
          The <C>label</C> stays inside the field (it is the field’s hint); help goes in{' '}
          <C>supportingText</C>. In Flutter, <C>controller</C> (a <C>ValueNotifier&lt;double&gt;</C>)
          holds the value outside the field like a <C>TextField</C>’s controller; on the web, pass{' '}
          <C>value</C> and <C>onValueChange</C>.
        </p>
        <Code
          code={`<NumberField
  label="Price"
  unit="DA"
  value={price}
  onValueChange={setPrice}
  supportingText="What the customer pays on delivery."
  validator={(value) => (value <= 0 ? 'Enter a price above 0 DA.' : null)}
/>`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Use it for values people adjust: prices, quantities, sizes, percentages, ratings.',
            'Set min and max whenever the range is real, so the fill tells people where they are.',
            'Pick a step that matches how the value is used (50 DA for fees, 0.1 for ratings).',
            <>Save in <C>onValueCommit</C>, not on every drag move.</>,
          ]}
          dontItems={[
            'Use it for identifiers like phone numbers or order IDs; use a text field.',
            'Hide the unit in the label; pass unit so it sits next to the value.',
            'Put very long labels inside; the value always keeps its space and the label truncates.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The field is one focusable control named by <C>label</C>, announced as a slider (bounded) or
          spin button (unbounded) with <C>aria-valuetext</C> including the unit. The steppers are
          pointer shortcuts and stay out of the Tab order, because the arrow keys do the same.
        </p>
        <Keys
          rows={[
            ['Arrow Up', 'Increase by one step (Arrow Right in left-to-right).'],
            ['Arrow Down', 'Decrease by one step (Arrow Left in left-to-right).'],
            ['Page Up', 'Increase by ten steps.'],
            ['Page Down', 'Decrease by ten steps.'],
            ['Home', 'Go to min (when set).'],
            ['End', 'Go to max (when set).'],
            ['Enter', 'Start typing; in the input, save.'],
            ['F2', 'Start typing.'],
            ['Escape', 'In the input, cancel.'],
            ['Backspace', 'Reset to defaultValue.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'number-field',
  title: 'Number field',
  group: 'Inputs',
  order: 3.5,
  summary: 'A Blender-style numeric control: drag to scrub, click to type (with arithmetic), with an optional range fill.',
  importLine: "import { NumberField } from '@feeef.dev/ui/primitives/number-field'",
  source: 'src/primitives/number-field.tsx',
  api: ['NumberField'],
  keywords: ['number', 'scrub', 'drag', 'spin button', 'blender', 'quantity', 'price', 'expression'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 200 }}>
      <NumberField label="Discount" unit="%" min={0} max={100} defaultValue={35} steppers={false} />
    </div>
  ),
})
