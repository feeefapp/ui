import { Link } from '../../../src/router'
import { Search } from 'lucide-react'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const VARIANTS = ['outlined', 'filled', 'tonal', 'elevated', 'text'] as const

const controls = {
  hint: { type: 'text', default: 'Customer name' },
  labelStyle: { type: 'select', options: ['outlined', 'inside'], default: 'outlined' },
  variant: { type: 'select', options: VARIANTS, default: 'outlined' },
  controlSize: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
  supportingText: { type: 'text', default: 'As it appears on the delivery label.' },
  leadingIcon: { type: 'boolean', label: 'Leading icon', default: false },
  multiline: { type: 'boolean', default: false },
  showCounter: { type: 'boolean', label: 'Counter', default: false },
  error: { type: 'boolean', label: 'Error', default: false },
  required: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
} as const

const SHELL_CODE = `<LabFieldShell hint="Order note" supportingText="Visible to your team only.">
  {({ id, describedBy, invalid }) => (
    <MyRichEditor id={id} aria-describedby={describedBy} aria-invalid={invalid} />
  )}
</LabFieldShell>`

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => {
          const field = {
            hint: v.hint || undefined,
            labelStyle: v.labelStyle as 'outlined' | 'inside',
            variant: v.variant as (typeof VARIANTS)[number],
            controlSize: v.controlSize as 'regular' | 'compact',
            supportingText: v.supportingText || undefined,
            leadingIcon: v.leadingIcon ? <Search size={18} /> : undefined,
            showCounter: v.showCounter,
            maxLength: v.showCounter ? 60 : undefined,
            error: v.error ? 'Enter the customer’s full name.' : undefined,
            required: v.required,
            disabled: v.disabled,
          }
          return (
            <div className="demo-column">
              {v.multiline ? (
                <LabTextField {...field} multiline minLines={2} maxLines={5} />
              ) : (
                <LabTextField {...field} />
              )}
            </div>
          )
        }}
        code={(v) =>
          jsx(
            'LabTextField',
            {
              hint: v.hint || undefined,
              labelStyle: v.labelStyle,
              variant: v.variant,
              controlSize: v.controlSize,
              supportingText: v.supportingText || undefined,
              leadingIcon: v.leadingIcon ? '{<Search size={18} />}' : undefined,
              multiline: v.multiline,
              minLines: v.multiline ? 2 : undefined,
              maxLines: v.multiline ? 5 : undefined,
              showCounter: v.showCounter,
              maxLength: v.showCounter ? 60 : undefined,
              error: v.error ? 'Enter the customer’s full name.' : undefined,
              required: v.required,
              disabled: v.disabled,
            },
            undefined,
            { labelStyle: 'outlined', variant: 'outlined', controlSize: 'regular' }
          ).replace('leadingIcon="{<Search size={18} />}"', 'leadingIcon={<Search size={18} />}')
        }
      />

      <Section title="When to use">
        <p>
          Use a text field whenever someone types a short value or a paragraph: names, phone numbers,
          addresses, order references, notes. For amounts people adjust (prices, quantities, fees) use a
          <Link to="/components/number-field">number field</Link>; for a value from a fixed list, a
          select; for a number on a continuous range, a slider.
        </p>
        <p>
          <C>LabTextField</C> renders a native <C>{'<input>'}</C>, or a <C>{'<textarea>'}</C> with{' '}
          <C>multiline</C>, so every native attribute works: <C>type</C>, <C>name</C>,{' '}
          <C>autoComplete</C>, <C>inputMode</C>, <C>required</C>, <C>pattern</C>, <C>maxLength</C>.
          Read the text with <C>onValueChange</C>, which receives the string, or with the usual{' '}
          <C>onChange</C> event.
        </p>
      </Section>

      <Section title="Hint and label style">
        <p>
          <C>hint</C> is the field’s name. It sits inside the empty field like a placeholder and
          floats up when the field gets focus or a value, so the name stays visible while typing.
          Always give a hint, or an <C>aria-label</C> when the field’s purpose is shown elsewhere.
        </p>
        <Table
          head={['labelStyle', 'Where the floated hint rests']}
          rows={[
            [<C>outlined</C>, 'On the top border, cut into the outline. The default; reads best in forms.'],
            [<C>inside</C>, 'Inside the field, above the value. Use it on filled or tonal surfaces and in dense panels.'],
          ]}
        />
        <p>
          <C>placeholder</C> is only shown when there is no <C>hint</C>. Use it for an example value in
          a field that is already named by its surroundings, such as a search box in a toolbar. Date,
          time, color and other non-text types always keep the hint floated, because the browser
          draws their own content.
        </p>
      </Section>

      <Section title="Variants and sizes">
        <p>
          <C>variant</C> uses the same emphasis vocabulary as buttons. Text fields default to{' '}
          <C>outlined</C>; <C>filled</C> and <C>tonal</C> give the field a tinted surface,{' '}
          <C>elevated</C> lifts it off a busy background, and <C>text</C> removes the surface for
          inline editing. Keep one variant per form.
        </p>
        <p>
          <C>controlSize</C> is <C>regular</C> (44px) or <C>compact</C> (40px). On touch screens
          compact fields grow back to a 44px target.
        </p>
      </Section>

      <Section title="Icons, prefixes and actions">
        <p>
          <C>leadingIcon</C> takes a decorative icon; it is hidden from assistive technology, so
          never rely on it to name the field. <C>leading</C> and <C>trailing</C> take any content:
          a <C>+213</C> phone prefix, a <C>DZD</C> unit, a clear or reveal button. The text inset
          adjusts to their measured width, so long affixes never overlap the value.
        </p>
      </Section>

      <Section title="Supporting text, errors and counters">
        <p>
          <C>supportingText</C> sits under the field and is linked to it with{' '}
          <C>aria-describedby</C>. While there is an error, the error replaces it in the same place
          and is announced politely. <C>showCounter</C> adds a character count on the right, as{' '}
          <C>12 / 60</C> when <C>maxLength</C> is set.
        </p>
      </Section>

      <Section title="Validation">
        <p>
          Validation runs on the native constraint API, so a form’s submit is blocked by any invalid
          field and the browser focuses the first one. Errors come from three places, and the field
          shows whichever applies:
        </p>
        <Table
          head={['Source', 'How', 'Use it for']}
          rows={[
            ['Native constraints', <><C>required</C>, <C>type="email"</C>, <C>pattern</C>, <C>minLength</C></>, 'Simple rules; the browser writes a localized message.'],
            [<C>validator</C>, 'A function that returns an error string or nothing', 'Domain rules with a message that says how to fix it.'],
            [<C>error</C>, 'A string you pass', 'Errors you learn about later, such as from the server. Clear it when the value changes.'],
          ]}
        />
        <p>
          <C>validationMode</C> decides when an error first appears. The default, <C>blur</C>, waits
          until the person leaves the field once and then updates as they type, so nobody is scolded
          for an unfinished value. <C>change</C> validates on every keystroke, for fields where live
          feedback helps. <C>submit</C> reveals and updates errors only when the form is submitted.
          Resetting the form clears every message. <C>onValidationChange</C> reports the visible
          message if you need it elsewhere, for example to disable a step.
        </p>
      </Section>

      <Section title="Multiline">
        <p>
          <C>multiline</C> switches to a textarea that grows with its content. <C>minLines</C> sets
          the empty height (1 by default) and <C>maxLines</C> the height after which it scrolls; the
          manual resize handle is removed. Enter inserts a line break instead of submitting.
        </p>
      </Section>

      <Section title="Building blocks">
        <p>
          The text field is two parts you can use on their own. <C>LabFieldShell</C> draws the frame:
          surface, floating hint, icons, affixes, supporting text and counter. Its child is a function
          that receives the <C>id</C>, <C>describedBy</C> and <C>invalid</C> values to put on your
          control, so the label and messages stay connected to it.
        </p>
        <Code code={SHELL_CODE} title="A custom control in the field frame" />
        <p>
          <C>LabRawInput</C> is the unpainted editor inside it: a native input or textarea with the same
          validation and auto-growing lines, and no styling of its own. Use it for bespoke editors that
          draw their own surface, such as an inline title. Both are listed on the API tab.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Name every field with a hint that stays short: “Phone number”, not “Please enter your phone number”.',
            'Put format help in supportingText: “10 digits, starting with 05, 06 or 07”.',
            'Write errors that say how to fix the value, not just that it is wrong.',
            <>Set <C>type</C>, <C>inputMode</C> and <C>autoComplete</C> so phones show the right keyboard and autofill works.</>,
          ]}
          dontItems={[
            'Use placeholder text as the only label; it disappears as soon as someone types.',
            'Validate on every keystroke by default; let the blur mode wait for a finished value.',
            'Mix outlined and filled fields in one form.',
            'Disable a field to show a value that cannot change; show it as text instead.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The hint is a real <C>{'<label>'}</C> tied to the control, and a required field adds a
          visual asterisk while the native <C>required</C> attribute tells assistive technology.
          Supporting text, errors and the counter are linked with <C>aria-describedby</C>; an error
          sets <C>aria-invalid</C> and is announced through a polite live region. With{' '}
          <C>{'dir="auto"'}</C> the field follows the direction of the typed text, which keeps
          Arabic and Latin values readable in the same form.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves focus into the field, then to its trailing action if it has one.'],
            ['Enter', 'Submits the form from a single-line field; inserts a line break in a multiline one.'],
            ['Escape', 'Clears a type="search" field (browser behavior).'],
          ]}
        />
        <Callout title="Icon buttons inside a field">
          <p>
            A clear or show-password button in <C>trailing</C> is a separate tab stop. Give it an{' '}
            <C>aria-label</C>, and return focus to the input after it acts.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'text-field',
  title: 'Text field',
  group: 'Inputs',
  order: 1,
  summary:
    'Text fields let people type a value or a paragraph, with a floating hint, affixes, supporting text and built-in validation.',
  importLine: "import { LabTextField } from '@feeef.dev/ui/primitives/text-field'",
  source: 'src/primitives/text-field.tsx',
  api: ['LabTextField', 'LabFieldShell', 'LabRawInput'],
  keywords: ['input', 'textarea', 'form', 'validation', 'field shell', 'raw input', 'counter', 'multiline'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 220 }}>
      <LabTextField hint="Customer name" defaultValue="Amina Belkacem" />
    </div>
  ),
})
