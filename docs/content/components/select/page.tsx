import { useState, type ComponentProps } from 'react'
import { MapPin } from 'lucide-react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const VARIANTS = ['elevated', 'outlined', 'filled', 'tonal', 'text'] as const
const WILAYAS = ['Alger', 'Oran', 'Constantine', 'Blida', 'Sétif', 'Annaba']

const controls = {
  hint: { type: 'text', default: 'Wilaya' },
  labelStyle: { type: 'select', options: ['outlined', 'inside'], default: 'outlined' },
  variant: { type: 'select', options: VARIANTS, default: 'elevated' },
  controlSize: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
  supportingText: { type: 'text', default: 'Delivery prices depend on the wilaya.' },
  leadingIcon: { type: 'boolean', label: 'Leading icon', default: false },
  error: { type: 'boolean', label: 'Error', default: false },
  disabled: { type: 'boolean', default: false },
} as const

function PlaygroundSelect(props: Omit<ComponentProps<typeof LabSelect>, 'value' | 'onValueChange'>) {
  const [value, setValue] = useState<string | null>(null)
  return <LabSelect {...props} value={value} onValueChange={setValue} />
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="demo-column">
            <PlaygroundSelect
              hint={v.hint || undefined}
              aria-label={v.hint ? undefined : 'Wilaya'}
              placeholder="Choose a wilaya"
              labelStyle={v.labelStyle as 'outlined' | 'inside'}
              variant={v.variant as (typeof VARIANTS)[number]}
              controlSize={v.controlSize as 'regular' | 'compact'}
              supportingText={v.supportingText || undefined}
              leadingIcon={v.leadingIcon ? <MapPin size={18} /> : undefined}
              error={v.error ? 'Choose where the order ships.' : undefined}
              disabled={v.disabled}
            >
              {WILAYAS.map((w) => (
                <LabOption key={w}>{w}</LabOption>
              ))}
            </PlaygroundSelect>
          </div>
        )}
        code={(v) =>
          jsx(
            'LabSelect',
            {
              hint: v.hint || undefined,
              labelStyle: v.labelStyle,
              variant: v.variant,
              controlSize: v.controlSize,
              supportingText: v.supportingText || undefined,
              leadingIcon: v.leadingIcon ? '__ICON__' : undefined,
              error: v.error ? 'Choose where the order ships.' : undefined,
              disabled: v.disabled,
              value: '__VALUE__',
              onValueChange: '__SET__',
            },
            WILAYAS.slice(0, 3)
              .map((w) => `<LabOption>${w}</LabOption>`)
              .join('\n'),
            { labelStyle: 'outlined', variant: 'elevated', controlSize: 'regular' }
          )
            .replace('leadingIcon="__ICON__"', 'leadingIcon={<MapPin size={18} />}')
            .replace('value="__VALUE__"', 'value={wilaya}')
            .replace('onValueChange="__SET__"', 'onValueChange={setWilaya}')
        }
      />

      <Section title="When to use">
        <p>
          Use a select to pick one value from a list that is too long for radio buttons, about
          six options or more: a wilaya, a courier, a currency, a sort order. With two to five
          options that people should compare, show them all with a radio group or a segmented
          control. For on/off use a switch.
        </p>
        <p>
          <C>LabSelect</C> is controlled: pass <C>value</C> (a string, or <C>null</C> for no
          selection) and <C>onValueChange</C>. Each <C>LabOption</C> uses its text as its value
          unless you give it a <C>value</C>.
        </p>
      </Section>

      <Section title="Field options">
        <p>
          The select shares the text field’s frame, so the same props work the same way:{' '}
          <C>hint</C> and <C>labelStyle</C>, <C>leadingIcon</C>, <C>leading</C>, <C>trailing</C>,{' '}
          <C>supportingText</C>, <C>error</C>, <C>variant</C> and <C>controlSize</C>. A form that
          mixes text fields and selects lines up without extra work. Selects default to the{' '}
          <C>elevated</C> variant; set <C>variant="outlined"</C> to match outlined text fields.
        </p>
        <Table
          head={['Prop', 'Behavior']}
          rows={[
            [<C>hint</C>, 'Names the select and floats once a value is chosen.'],
            [<C>placeholder</C>, 'Shown in the empty trigger only when there is no hint. Use with aria-label.'],
            [<C>{"<LabOption value=\"\">"}</C>, 'A “no selection” choice, such as “Any courier” in a filter.'],
          ]}
        />
        <p>
          Without any decoration (no hint, placeholder, icons, text or validation) the select renders
          as a bare control-sized button, for toolbars and inline sort menus. It then needs an{' '}
          <C>aria-label</C>.
        </p>
      </Section>

      <Section title="Forms and validation">
        <p>
          Give the select a <C>name</C> and its value is submitted with the form through a hidden
          input. <C>required</C> blocks submission while nothing is chosen, shows{' '}
          <C>requiredMessage</C> (“Choose an option.” by default) and moves focus to the trigger.
          A <C>validator</C> returns an error for values that are allowed in the list but not in this
          context. As with text fields, <C>validationMode</C> is <C>blur</C> by default: the error
          appears once the menu closes or the trigger loses focus. Resetting the form clears it.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Order options in a way people expect: alphabetical, by wilaya code, or by frequency.',
            'Keep option text short; it becomes the trigger text once chosen.',
            'Use a hint that names the value, like “Courier”, not an instruction.',
            'Pre-select a sensible default when one exists, such as the store’s usual courier.',
          ]}
          dontItems={[
            'Use a select for two options; show them as radios or a switch.',
            'Put actions such as “Add new courier…” in the option list.',
            'Rely on placeholder text alone to name the field.',
            'Change the list of options while the menu is open.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The trigger is a button with the combobox pattern and the menu is a listbox; the hint is
          its label, and supporting text and errors are linked with <C>aria-describedby</C>. The
          menu follows the page direction, including right-to-left layouts, and opens inside the
          nearest dialog so it works in modals.
        </p>
        <Keys
          rows={[
            ['Enter', 'Opens the menu; selects the focused option.'],
            ['Space', 'Opens the menu; selects the focused option.'],
            ['Arrow Down', 'Opens the menu, or moves to the next option.'],
            ['Arrow Up', 'Opens the menu, or moves to the previous option.'],
            ['Home', 'Moves to the first option.'],
            ['End', 'Moves to the last option.'],
            ['Escape', 'Closes the menu without changing the value.'],
            ['A–Z', 'Type the start of an option to jump to it.'],
          ]}
        />
        <Callout title="Long lists">
          <p>
            A select works for the list of wilayas because typeahead jumps to a name. For hundreds of
            items, such as products or communes, use a searchable picker instead.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'select',
  title: 'Select',
  group: 'Inputs',
  order: 2,
  summary: 'Selects let people choose one value from a list, in the same field frame as text fields.',
  importLine: "import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'",
  source: 'src/primitives/select.tsx',
  api: ['LabSelect', 'LabOption'],
  keywords: ['dropdown', 'picker', 'menu', 'listbox', 'combobox', 'option'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 220 }}>
      <LabSelect hint="Wilaya" value="Oran" onValueChange={() => {}}>
        <LabOption>Oran</LabOption>
      </LabSelect>
    </div>
  ),
})
