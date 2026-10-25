import { useState } from 'react'
import { LayoutGrid, List, Columns3 } from 'lucide-react'
import { GlassScope } from '@feeef.dev/ui/glass'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

type View = 'list' | 'board' | 'grid'
type Surface = 'glass' | 'box' | 'bare'

const controls = {
  surface: { type: 'select', options: ['glass', 'box', 'bare'], default: 'glass' },
  icons: { type: 'boolean', default: true },
  disabled: { type: 'boolean', default: false },
  disableBoard: { type: 'boolean', label: 'Disable “Board”', default: false },
} as const

function PlaygroundControl(props: { surface: Surface; icons: boolean; disabled: boolean; disableBoard: boolean }) {
  const [view, setView] = useState<View>('list')
  const control = (
    <SegmentedControl
      label="Orders view"
      className={props.surface === 'box' ? 'demo-segmented-box' : undefined}
      value={view}
      onChange={setView}
      disabled={props.disabled}
      options={[
        { value: 'list', label: 'List', icon: props.icons ? <List /> : undefined },
        { value: 'board', label: 'Board', icon: props.icons ? <Columns3 /> : undefined, disabled: props.disableBoard },
        { value: 'grid', label: 'Grid', icon: props.icons ? <LayoutGrid /> : undefined },
      ]}
    />
  )
  return props.surface === 'glass' ? (
    <GlassScope>
      <ToolbarGroup label="Orders view">{control}</ToolbarGroup>
    </GlassScope>
  ) : (
    control
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PlaygroundControl
            surface={v.surface as Surface}
            icons={v.icons}
            disabled={v.disabled}
            disableBoard={v.disableBoard}
          />
        )}
        code={(v) => {
          const icon = (name: string) => (v.icons ? `, icon: <${name} />` : '')
          const attrs = [
            'label="Orders view"',
            v.surface === 'box' ? 'className="segmented-box" /* background: var(--lab-surface-soft) */' : '',
            'value={view}',
            'onChange={setView}',
            v.disabled ? 'disabled' : '',
          ].filter(Boolean)
          const control = `<SegmentedControl\n  ${attrs.join('\n  ')}\n  options={[\n    { value: 'list', label: 'List'${icon('List')} },\n    { value: 'board', label: 'Board'${icon('Columns3')}${v.disableBoard ? ', disabled: true' : ''} },\n    { value: 'grid', label: 'Grid'${icon('LayoutGrid')} },\n  ]}\n/>`
          return v.surface === 'glass'
            ? `<GlassScope>\n  <ToolbarGroup label="Orders view">\n    ${control.replace(/\n/g, '\n    ')}\n  </ToolbarGroup>\n</GlassScope>`
            : control
        }}
      />

      <Section title="When to use">
        <p>
          A segmented control picks one of two to five short, related options that are all visible at
          once: a view (List, Board), a mode (Home delivery, Stop desk), a period (Day, Week, Month).
          The choice usually takes effect immediately and changes what is shown nearby. When its row
          runs out of room it folds into a menu, like an actions bar. It also filters a list by status
          (New 21, Calling 14, …): then there can be many options, each with a count, and the control
          scrolls instead (<C>overflow="scroll"</C>).
        </p>
        <Table
          head={['Need', 'Use']}
          rows={[
            ['One of 2–5 short options, applied right away', <C>SegmentedControl</C>],
            ['A list filtered by status, with counts (8–12 statuses)', <><C>SegmentedControl</C> with <C>badge</C>s and <C>overflow="scroll"</C></>],
            ['One of many options, or long labels', <C>Select</C>],
            ['A choice inside a form, submitted with it', <C>RadioGroup</C>],
            ['Switching between whole pages or panels with their own content', 'Tabs'],
            ['Turning one thing on or off', 'A switch or a toggle button'],
          ]}
        />
      </Section>

      <Section title="Options">
        <p>
          <C>options</C> is an array of <C>{'{ value, label, icon?, tone?, badge?, disabled? }'}</C>.{' '}
          <C>value</C> is typed from the options, so <C>onChange</C> receives the same string union as{' '}
          <C>value</C>. Icons are decorative and sit before the label; keep the label even when an
          icon is shown. Options sit in one row and hug their labels; when they don’t fit the control
          folds into a menu, or scrolls (see When options don’t fit). <C>equalWidth</C> fills the
          width with one row of equal options instead (labels end in an ellipsis; it never folds or
          scrolls).
        </p>
        <p>
          The control is as tall as a regular button at every density (36px comfortable, 30px compact,
          26px thin; a toolbar bubble’s control height inside one). On touch screens it keeps that height
          and each option’s hit area reaches 44px. The pill sits{' '}
          <C>--lab-segmented-inset</C> (2px) inside it and options are no farther apart than that inset.
          Labels are 13px semibold. Change the inset app-wide with <C>ThemeConfig.metrics.segmentedInset</C>{' '}
          and the height with <C>controlHeight.regular</C>.
        </p>
      </Section>

      <Section title="Badges and tones">
        <p>
          <C>badge</C> puts a short count or tag after the label (“New 21”): a small neutral pill (18px,
          11px semibold, tabular figures so counts don’t jitter as they change) in the label’s own ink.
          On the selected option it takes the pill’s ink instead, so it stays readable on the pill, and
          it turns over with the label as the pill slides across it. It is part of the option’s
          accessible name: “New, 21”. Keep badges to numbers or a word; a badge never replaces the
          label.
        </p>
        <p>
          <C>tone</C> (<C>'success' | 'warning' | 'danger'</C>, Flutter <C>SegmentTone</C>) colours an
          option’s icon, only the icon, with the status token while it isn’t selected; the selected
          icon takes the pill’s ink. Use it for statuses that carry meaning (Delivered, Returned,
          Cancelled), never as decoration and never as the only cue.
        </p>
      </Section>

      <Section title="When options don’t fit">
        <p>
          A segmented control never wraps or squeezes its options. When its row has no room for all of
          them it adapts the way an <Link to="/components/actions-bar">actions bar</Link> spills into
          More, and <C>overflow</C> says how:
        </p>
        <Table
          head={['overflow', 'What happens', 'For']}
          rows={[
            [<C>menu</C>, 'The other options fold into the selected one on a spring, the pill stays where it is and gains a chevron: one capsule that opens every option as a single-choice menu growing out of it. It unfolds as soon as the room is back.', 'Views and modes (the default)'],
            [<C>scroll</C>, 'The options scroll sideways inside the control (below).', 'A status filter with many options and counts'],
          ]}
        />
        <p>
          Folding is fitted per row, not per control: every foldable control in the same row (an app
          bar, a toolbar, a stage) is measured with its real labels and fonts, and they fold from the
          end until the row fits, so two controls never fight over the same space and nothing flips
          back and forth. A squeezed title in that row counts at its full width, so the controls fold
          before the title truncates. The menu keeps radio semantics (each row is a{' '}
          <C>menuitemradio</C> with <C>aria-checked</C>), opens on the chosen option and grows out of
          the capsule like every kit menu. In Flutter the control folds by the width its parent gives
          it: in a <C>Row</C> wrap it in <C>Flexible</C>.
        </p>
        <p>
          With <C>overflow="scroll"</C>, options that don’t fit the space it is given scroll sideways
          inside the control’s own inset, so a glass bubble or box around it stays put. The edges fade where there is more (the fade grows as content moves past the
          edge), and the selected option scrolls into view whenever the selection changes: a tap, an
          arrow key, a released drag or a new <C>value</C> from the owner. It stops clear of the fade.
          The pill moves with its option as the row scrolls.
        </p>
        <p>
          Wheel, trackpad and touch swipes scroll the row. On touch a drag that starts on the pill moves
          the pill; anywhere else it scrolls (a tap still selects). Drag the pill toward an edge and the
          row scrolls on by itself, faster the closer you get; release and the pill settles on the
          nearest option as usual. Arrow keys select and reveal. In Flutter it needs a bounded width:
          in a <C>Row</C> (a <C>ToolbarGroup</C>’s too) wrap it in <C>Flexible</C>.
        </p>
      </Section>

      <Section title="Surface: glass, box or bare">
        <p>
          The control paints no track, border or glass of its own: only its options and the moving
          pill (with the inset around them, so the pill sits right on whatever you put behind it). You
          choose the surface:
        </p>
        <Table
          head={['Where', 'Surface', 'How']}
          rows={[
            ['Floating: app bar, toolbar, dock, dialog top bar', 'Glass', <>Inside a <C>ToolbarGroup</C> (in a <C>GlassScope</C> when no bar provides one) or a <C>Dock</C>; Flutter the same</>],
            ['Content and forms: a card, a settings row, a panel', 'A plain box', <>A surface-token background on the control: <C>className</C> with <C>background: var(--lab-surface-soft)</C> (the root already has the capsule radius). Flutter: a <C>DecoratedBox</C> with <C>colors.surfaceSoft</C> and <C>SuperellipseBorder(radius: sizes.radiusControl)</C></>],
            ['Already on a group, or light enough on its own', 'Bare', 'Nothing: the selected pill is the only paint'],
          ]}
        />
        <Callout title="Apps must wrap their segmented controls">
          <p>
            Since the control lost its built-in track, consumers (Lab, Cloud console, …) must give every
            segmented control one of these surfaces when they upgrade. The <C>appearance</C> prop is gone
            (Flutter: <C>appearance</C> and <C>SegmentedAppearance</C>), and so is the{' '}
            <C>segmentedHeight</C> metric (<C>--lab-segmented-height</C>): the height is the regular
            button height.
          </p>
        </Callout>
      </Section>

      <Section title="Motion and dragging">
        <p>
          Choosing an option slides the filled pill there, changing its width on the way, on the{' '}
          <C>snappy</C> spring; a new choice mid-flight picks up the pill where it is, at its speed.
          Press the pill and it lifts into a glass lens: it swells like a pressed glass bubble, shows
          the same touch glow and stretches along a quick drag. Drag it and it follows the pointer,
          kept on the track with a slight rubber band at the ends; release it and it settles on the
          nearest option (a flick carries on to the next) on the <C>release</C> spring, keeping the
          pointer’s speed. Pressing another option and dragging works too: the pill comes to the
          pointer. A plain tap still selects.
        </p>
        <p>
          <C>onChange</C> fires once, on the release, never while dragging. A press in the control never
          swells the glass bubble around it. Reduced motion moves the pill instantly with no lens,
          stretch or glow; reduced transparency, more contrast and the <C>solid</C> glass style keep a
          solid pill.
        </p>
        <p>
          The <Link to="/components/tab-view">tab view</Link>’s tab bar shares this base (the same
          pill, lens, drag and keyboard), with tab semantics and icons stacked over labels.
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
            'Put more than five options in it for anything but a status filter, or options of very different lengths.',
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
          selected option sits on a solid primary pill, so the state never depends on text color alone.
          Dragging is an extra: every choice is also a tap or a key press away.
        </p>
        <p>
          Folded into a menu, the capsule is a button named by the group and its value (“Orders view:
          Board”) with <C>aria-haspopup="menu"</C>; the folded options leave the Tab order and the
          accessibility tree. Left and Right (mirrored in right-to-left), Home and End still step
          through the options without opening it; Up, Down, Enter and Space open the menu on the
          chosen option, Escape closes it and focus returns to the capsule.
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
  summary:
    'A single choice among short options, shown side by side, with radio semantics; it folds into a menu when its row runs out of room, and a status filter scrolls.',
  importLine: "import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'",
  source: 'src/primitives/segmented.tsx',
  api: ['SegmentedControl'],
  keywords: ['toggle group', 'button group', 'tabs', 'radio', 'switcher', 'mode', 'drag', 'liquid glass', 'pill', 'badge', 'count', 'status', 'scroll', 'overflow', 'menu', 'collapse', 'fold'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <SegmentedControl
      label="Orders view"
      className="demo-segmented-box"
      value="list"
      onChange={() => {}}
      options={[
        { value: 'list', label: 'List' },
        { value: 'board', label: 'Board' },
      ]}
    />
  ),
})
