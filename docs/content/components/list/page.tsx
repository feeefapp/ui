import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          Lists are the backbone of drill-down apps: settings, orders, customers, couriers. Rows that
          open a page sit on a <Link to="/components/navigation-stack">navigation stack</Link> or in a{' '}
          <Link to="/components/split-view">split view</Link>; rows that show a value or a switch are
          static.
        </p>
      </Section>

      <Section title="Rows">
        <Table
          head={['Prop', 'Use']}
          rows={[
            [<C>chevron</C>, 'The row opens another page. Not on wide split views, where the item opens beside the list.'],
            [<C>leading</C>, 'An icon, avatar, thumbnail or a checkbox without a label (name it with aria-label). Hairlines start after it.'],
            [<C>trailing</C>, 'A value, count, badge or control (a switch). It takes up to 45% of the row’s width inside its insets; longer text ellipsizes.'],
            [<C>selected</C>, 'The open item in a split view.'],
            [<C>static</C>, 'Not interactive: information or a row that holds its own control.'],
            [<C>asChild</C>, 'Your router link as the row.'],
          ]}
        />
        <p>
          Rows are iOS's inset-grouped rows: 54px tall on a card with 26px corners, with 16px sides and
          hairlines (44px, 20px and 12px in compact density). Change them app-wide with{' '}
          <C>ThemeConfig.metrics</C> (<C>listRowHeight</C>, <C>listRadius</C>, <C>listInset</C>).
        </p>
      </Section>

      <Section title="Swipe actions">
        <p>
          <C>leadingActions</C> appear when the row is swiped toward the end, <C>trailingActions</C>{' '}
          when it is swiped toward the start. The row follows the finger; released past half the
          buttons it stays open, a long swipe runs the first action (set <C>{'fullSwipe={false}'}</C> to
          prevent that). Opening one row closes the other, and tapping an open row closes it.
        </p>
        <Code
          code={`<ListRow
  title="#1048 · Amina Benali"
  leadingActions={[{ label: 'Confirm', tone: 'primary', icon: <Check />, onAction: confirm }]}
  trailingActions={[
    { label: 'Delete', tone: 'destructive', icon: <Trash2 />, onAction: remove },
    { label: 'Archive', icon: <Archive />, onAction: archive },
  ]}
/>`}
        />
        <DoDont
          doItems={[
            'Offer the same actions somewhere visible too (the item’s page or a menu): a swipe is a shortcut.',
            'Put the most likely action first; make the destructive one red.',
          ]}
          dontItems={['Put more than three actions on a side.', 'Run a destructive full swipe on data that cannot be restored; ask instead.']}
        />
      </Section>

      <Section title="Reordering">
        <p>
          Give the section <C>onReorder(from, to)</C> and every row gets a grip. Drag the grip with
          any pointer: the row lifts and follows 1:1, the others part around it, the list scrolls when
          the row nears an edge, and on release the row springs into its slot. With the keyboard, focus a
          grip and press the arrow keys; each move is announced.
        </p>
      </Section>

      <Section title="Accessibility">
        <ul>
          <li>Sections are lists; each row is a list item with a native button or your link.</li>
          <li>Swipe actions open with the arrow keys on a focused row and close with Escape.</li>
          <li>Grips are labelled buttons (“Reorder Amina Benali”); moves are announced in a live region.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'list',
  title: 'List',
  group: 'Containment',
  order: 3,
  summary: 'Inset-grouped rows with chevrons, values, swipe actions and drag-to-reorder.',
  importLine: "import { ListSection, ListRow } from '@feeef.dev/ui/primitives/list'",
  source: 'src/primitives/list.tsx',
  api: ['ListSection', 'ListRow'],
  keywords: ['list', 'row', 'table view', 'swipe', 'actions', 'reorder', 'drag', 'sortable', 'settings'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
