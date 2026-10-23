import { useState } from 'react'
import { LayoutGrid, List, Columns3 } from 'lucide-react'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

type View = 'list' | 'board' | 'grid'

const controls = {
  appearance: { type: 'select', options: ['grouped', 'plain'], default: 'grouped' },
  icons: { type: 'boolean', default: true },
  disabled: { type: 'boolean', default: false },
  disableBoard: { type: 'boolean', label: 'Disable “Board”', default: false },
} as const

function PlaygroundControl(props: {
  appearance: 'grouped' | 'plain'
  icons: boolean
  disabled: boolean
  disableBoard: boolean
}) {
  const [view, setView] = useState<View>('list')
  return (
    <SegmentedControl
      label="Orders view"
      value={view}
      onChange={setView}
      appearance={props.appearance}
      disabled={props.disabled}
      options={[
        { value: 'list', label: 'List', icon: props.icons ? <List /> : undefined },
        { value: 'board', label: 'Board', icon: props.icons ? <Columns3 /> : undefined, disabled: props.disableBoard },
        { value: 'grid', label: 'Grid', icon: props.icons ? <LayoutGrid /> : undefined },
      ]}
    />
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PlaygroundControl
            appearance={v.appearance as 'grouped' | 'plain'}
            icons={v.icons}
            disabled={v.disabled}
            disableBoard={v.disableBoard}
          />
        )}
        code={(v) => {
          const icon = (name: string) => (v.icons ? `, icon: <${name} />` : '')
          const attrs = [
            'label="Orders view"',
            'value={view}',
            'onChange={setView}',
            v.appearance === 'plain' ? 'appearance="plain"' : '',
            v.disabled ? 'disabled' : '',
          ].filter(Boolean)
          return `<SegmentedControl\n  ${attrs.join('\n  ')}\n  options={[\n    { value: 'list', label: 'List'${icon('List')} },\n    { value: 'board', label: 'Board'${icon('Columns3')}${v.disableBoard ? ', disabled: true' : ''} },\n    { value: 'grid', label: 'Grid'${icon('LayoutGrid')} },\n  ]}\n/>`
        }}
      />

      <Section title="When to use">
        <p>
          A segmented control picks one of two to five short, related options that are all visible at
          once: a view (List, Board), a mode (Home delivery, Stop desk), a period (Day, Week, Month).
          The choice usually takes effect immediately and changes what is shown nearby.
        </p>
        <Table
          head={['Need', 'Use']}
          rows={[
            ['One of 2–5 short options, applied right away', <C>SegmentedControl</C>],
            ['One of many options, or long labels', <C>Select</C>],
            ['A choice inside a form, submitted with it', <C>RadioGroup</C>],
            ['Switching between whole pages or panels with their own content', 'Tabs'],
            ['Turning one thing on or off', 'A switch or a toggle button'],
          ]}
        />
      </Section>

      <Section title="Options">
        <p>
          <C>options</C> is an array of <C>{'{ value, label, icon?, disabled? }'}</C>.{' '}
          <C>value</C> is typed from the options, so <C>onChange</C> receives the same string union as{' '}
          <C>value</C>. Icons are decorative and sit before the label; keep the label even when an
          icon is shown. Options hug their labels and wrap onto a new line when space runs out.
        </p>
        <p>
          <C>appearance="grouped"</C> (the default) draws the control’s own glass container.{' '}
          <C>appearance="plain"</C> drops it, for a control that sits on a surface that is already a
          group, such as a toolbar, a dock or a dialog header.
        </p>
        <p>
          Its size is iOS's: a 32px capsule track with 28px options 2px from its edge and 2px apart,
          labels 13px semibold. Change it app-wide with <C>ThemeConfig.metrics.segmentedHeight</C> and{' '}
          <C>segmentedInset</C>; options stay no farther apart than the inset. Touch screens keep 44px
          options.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Use one or two words per option, in sentence case.',
            'Keep the order stable and logical: smallest to largest, most to least common.',
            'Apply the choice immediately and show its effect next to the control.',
            <>Give the group a <C>label</C> that names the choice: “Orders view”, “Delivery type”.</>,
          ]}
          dontItems={[
            'Use it for actions; each option should be a state, not a command.',
            'Put more than five options in it, or options of very different lengths.',
            'Use icons without labels.',
            'Rely on it inside a form that needs a native submitted value; use a radio group.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The control is a <C>radiogroup</C> named by <C>label</C>, and each option is a{' '}
          <C>radio</C> with <C>aria-checked</C>. Only the selected option is in the Tab order (or the
          first enabled one when nothing valid is selected). Arrow keys move and select at once, wrap
          at the ends and skip disabled options; in right-to-left layouts Left and Right swap. The
          selected option has a solid primary fill, so the state never depends on text color alone.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves focus into the group, onto the selected option, and out again.'],
            ['ArrowRight', 'Selects the next option (previous in RTL).'],
            ['ArrowLeft', 'Selects the previous option (next in RTL).'],
            ['ArrowDown', 'Selects the next option.'],
            ['ArrowUp', 'Selects the previous option.'],
            ['Home', 'Selects the first enabled option.'],
            ['End', 'Selects the last enabled option.'],
            ['Space', 'Selects the focused option.'],
          ]}
        />
        <Callout title="Arrow keys select">
          <p>
            Every arrow press calls <C>onChange</C>. If changing the value is expensive (a network
            request, a heavy re-render), debounce the work rather than the control.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'segmented-control',
  title: 'Segmented control',
  group: 'Actions',
  order: 2,
  summary: 'A single choice among two to five short options, shown side by side, with radio semantics.',
  importLine: "import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'",
  source: 'src/primitives/segmented.tsx',
  api: ['SegmentedControl'],
  keywords: ['toggle group', 'button group', 'tabs', 'radio', 'switcher', 'mode'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <SegmentedControl
      label="Orders view"
      value="list"
      onChange={() => {}}
      options={[
        { value: 'list', label: 'List' },
        { value: 'board', label: 'Board' },
      ]}
    />
  ),
})
