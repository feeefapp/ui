import { useMemo, useState } from 'react'
import { Check, Printer, Download, Trash2, Truck, UserRound } from 'lucide-react'
import { ActionsBar, type Action } from '@feeef.dev/ui/actions'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

const controls = {
  width: { type: 'number', label: 'Host width (px)', min: 120, max: 720, step: 10, default: 560 },
  size: { type: 'select', options: ['small', 'regular'], default: 'regular' },
  align: { type: 'select', options: ['end', 'start'], default: 'end' },
  icons: { type: 'boolean', label: 'Icons', default: true },
} as const

function PlaygroundBar({
  width,
  size,
  align,
  icons,
}: {
  width: number
  size: 'small' | 'regular'
  align: 'start' | 'end'
  icons: boolean
}) {
  const [urgent, setUrgent] = useState(false)
  const actions = useMemo<Action[]>(
    () => [
      { id: 'delete', type: 'action', label: 'Delete', icon: icons ? <Trash2 /> : undefined, destructive: true, priority: -1, onAction: () => {} },
      { id: 'print', type: 'action', label: 'Print labels', icon: icons ? <Printer /> : undefined, priority: 0, onAction: () => {} },
      { id: 'export', type: 'group', label: 'Export', icon: icons ? <Download /> : undefined, priority: 1, actions: [
        { id: 'csv', type: 'action', label: 'CSV', onAction: () => {} },
        { id: 'xlsx', type: 'action', label: 'Excel', onAction: () => {} },
      ] },
      { id: 'urgent', type: 'toggle', label: 'Urgent', checked: urgent, priority: 2, onCheckedChange: setUrgent },
      { id: 'assign', type: 'action', label: 'Assign agent', icon: icons ? <UserRound /> : undefined, priority: 3, onAction: () => {} },
      { id: 'ship', type: 'action', label: 'Ship', icon: icons ? <Truck /> : undefined, priority: 4, onAction: () => {} },
      { id: 'confirm', type: 'action', label: 'Confirm', icon: icons ? <Check /> : undefined, variant: 'filled', priority: 10, onAction: () => {} },
    ],
    [icons, urgent]
  )
  return (
    <div style={{ width: `min(100%, ${width}px)`, padding: 4, outline: '1px dashed var(--lab-line)', borderRadius: 12 }}>
      <ActionsBar actions={actions} label="Selected orders" size={size} align={align} />
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PlaygroundBar
            width={v.width}
            size={v.size as 'small' | 'regular'}
            align={v.align as 'start' | 'end'}
            icons={v.icons}
          />
        )}
        code={(v) =>
          `<div style={{ width: ${v.width} }}>\n  <ActionsBar\n    label="Selected orders"\n    actions={actions}${v.size === 'small' ? '\n    size="small"' : ''}${v.align === 'start' ? '\n    align="start"' : ''}\n  />\n</div>`
        }
      />

      <Section title="When to use">
        <p>
          Use an actions bar when a row of commands must fit a space whose width you don’t control: a
          bulk-selection dock, a dialog footer, a card toolbar, a phone screen. Instead of wrapping or
          clipping, the bar measures its real buttons and moves the least important ones into a
          “More actions” menu, so every action stays reachable at any width, language or zoom level.
        </p>
        <p>
          It usually lives inside a <Link to="/components/dock">Dock</Link>, which floats it over the
          content and tells it how much room it has. For two or three fixed buttons that always fit,
          plain <Link to="/components/button">buttons</Link> are simpler.
        </p>
      </Section>

      <Section title="Describing actions">
        <p>
          You pass data, not buttons. Each action has a unique <C>id</C>, a <C>label</C> (its
          accessible name and menu text) and a <C>type</C>:
        </p>
        <Table
          head={['Type', 'Shape', 'Inline', 'In a menu']}
          rows={[
            [<C>action</C>, <C>{'onAction(): void | Promise<void>'}</C>, 'Button', 'Menu item'],
            [<C>toggle</C>, <C>{'checked, onCheckedChange(checked)'}</C>, <>Button with <C>aria-pressed</C></>, 'Checkbox item'],
            [<C>group</C>, <C>{'actions: Action[], onOpen?()'}</C>, 'Button that opens a menu', 'Submenu'],
          ]}
        />
        <p>
          Every type also takes <C>icon</C>, <C>display</C> (<C>"label"</C> or <C>"icon"</C>),{' '}
          <C>tooltip</C>, <C>priority</C>, <C>disabled</C>, <C>loading</C>, <C>destructive</C> and{' '}
          <C>variant</C>. Actions are quiet toolbar buttons by default; give the main one{' '}
          <C>variant="filled"</C>. Groups nest to any depth, and an empty group is disabled.{' '}
          <C>onOpen</C> can return <C>false</C> to keep a group closed, for example when nothing is
          selected.
        </p>
        <Code
          code={`import { ActionsBar, type Action } from '@feeef.dev/ui/actions'

const actions: Action[] = [
  { id: 'delete', type: 'action', label: 'Delete', destructive: true, priority: -1, onAction: remove },
  { id: 'export', type: 'group', label: 'Export', priority: 1, actions: [
    { id: 'csv', type: 'action', label: 'CSV', onAction: exportCsv },
  ] },
  { id: 'urgent', type: 'toggle', label: 'Urgent', checked: urgent, onCheckedChange: setUrgent },
  { id: 'confirm', type: 'action', label: 'Confirm', variant: 'filled', priority: 10, onAction: confirm },
]

<ActionsBar label="Selected orders" actions={actions} />`}
        />
      </Section>

      <Section title="Overflow by priority">
        <p>
          When the actions don’t fit, the bar spills top-level actions into the overflow menu, lowest{' '}
          <C>priority</C> first (default 0). Among equal priorities, the last one spills first. Both
          the row and the menu keep your source order, so the layout never reshuffles. A group moves
          as a whole and becomes a submenu. The fit counts the overflow button and every gap, and a
          very narrow host still gets the overflow button, so nothing is ever lost.
        </p>
        <p>
          Measuring uses hidden, inert copies of the real buttons, so fonts, translations, zoom and
          loading spinners are all accounted for. If a focused action moves into the menu, focus
          moves to the overflow button.
        </p>
      </Section>

      <Section title="Menus">
        <p>
          The overflow button and every group open a <Link to="/components/menu">menu</Link>: one
          Liquid Glass bubble that grows out of the button and covers it, then flies back into it
          when it closes. In a bar, the menu lines up with the button’s outer edge, so a menu at the
          end of the bar grows toward the start and one at the start grows toward the end; it never
          leaves the window, or the nearest <C>FloatingBoundary</C>. Submenus open beside their row.
          Nothing behind the menu dims, and reduced motion swaps the morph for a short crossfade.
        </p>
      </Section>

      <Section title="Async work and errors">
        <p>
          If <C>onAction</C> or <C>onCheckedChange</C> returns a promise, the bar shows a loader on
          that action and ignores repeat activations until it settles, inline or in the menu. If the
          promise rejects, the bar shows an inline alert (“Print labels could not complete. Try
          again.”) and calls <C>onActionError(error, action)</C> so you can log it or show your own
          message. Use <C>loading</C> for work you track yourself.
        </p>
      </Section>

      <Section title="Width from a parent">
        <p>
          By default the bar fits the width of its own host element. A shrink-wrapping parent, like a
          dock that is only as wide as its content, can’t give a meaningful host width, so it passes
          the space it has through <C>ActionsWidthProvider</C> instead. <C>Dock</C> already does
          this; you only need the provider when you build a similar shrink-wrapping container
          yourself.
        </p>
        <Code
          code={`import { ActionsBar, ActionsWidthProvider } from '@feeef.dev/ui/actions'

<ActionsWidthProvider value={availableWidth}>
  <ActionsBar label="Card actions" actions={actions} />
</ActionsWidthProvider>`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Give the main action the highest priority and variant="filled", so it is the last to spill.',
            'Give destructive and rare actions the lowest priority.',
            'Keep business state in your component and pass it in (checked, disabled, loading).',
            'Return the promise from onAction so the bar can show progress and block double clicks.',
          ]}
          dontItems={[
            'Put the bar in an unbounded row; it needs a parent with a definite width.',
            'Reuse an id anywhere in the tree, including inside groups.',
            <>Use <C>display="icon"</C> for actions people can’t recognize from the icon alone.</>,
            'Create a new actions array on every render without memoizing; it re-measures each time.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The bar is a <C>group</C> named by <C>label</C>. Each control is a native button whose
          accessible name is the action’s label, including icon-only ones, which also get it as a
          tooltip. Toggles expose <C>aria-pressed</C> inline and checkbox semantics in menus; loading
          items set <C>aria-busy</C>. Menus are Radix dropdown menus on <C>MenuSurface</C>, with
          typeahead, submenus and focus return. Inside a <C>{'<dialog>'}</C>, menus portal into the
          dialog so they stay in its top layer, and inside a <C>FloatingBoundary</C> into the boundary;{' '}
          <C>portalContainer</C> overrides both.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves between the visible controls and the overflow button.'],
            ['Enter', 'Activates a control, or opens a group or the overflow menu.'],
            ['Space', 'Activates a control, or opens a menu.'],
            ['ArrowDown', 'In a menu: next item.'],
            ['ArrowUp', 'In a menu: previous item.'],
            ['ArrowRight', 'In a menu: opens a submenu.'],
            ['Escape', 'Closes the menu and returns focus to its button.'],
          ]}
        />
        <Callout title="Labels are required">
          <p>
            Every action needs a <C>label</C>, even with <C>display="icon"</C>: it is the button’s
            name and the text it shows once it moves into the menu.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'actions-bar',
  title: 'Actions bar',
  group: 'Actions',
  order: 3,
  summary:
    'A row of actions that fits any width, moving the lowest-priority ones into a “More actions” menu.',
  importLine: "import { ActionsBar, type Action } from '@feeef.dev/ui/actions'",
  source: 'src/actions/actions-bar.tsx',
  api: ['ActionsBar', 'ActionsWidthProvider'],
  keywords: ['toolbar', 'overflow', 'more actions', 'menu', 'bulk actions', 'priority', 'responsive'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 220 }}>
      <ActionsBar
        label="Order actions"
        size="small"
        actions={[
          { id: 'print', type: 'action', label: 'Print', onAction: () => {} },
          { id: 'export', type: 'action', label: 'Export', onAction: () => {} },
          { id: 'confirm', type: 'action', label: 'Confirm', variant: 'filled', priority: 10, onAction: () => {} },
        ]}
      />
    </div>
  ),
})
