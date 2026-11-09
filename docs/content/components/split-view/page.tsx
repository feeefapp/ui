import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          A split view keeps a list and the item it opened on screen together, like Mail or Notes on
          iPad: orders and the open order, products and the product being edited, customers and their
          history. People move through many items quickly without losing their place in the list.
        </p>
        <p>
          Below the compact breakpoint there is no room for two columns, so the split view becomes a{' '}
          <Link to="/components/navigation-stack">navigation stack</Link>: the list is the root page and
          opening an item pushes it. You write the pages once.
        </p>
        <p>
          When deeper records should become additional desktop columns and new sheets on phones,
          use <Link to="/components/panel-host">adaptive panels</Link> instead. SplitView deliberately
          keeps deeper pages inside its detail column; do not nest split views to build a panel chain.
        </p>
      </Section>

      <Section title="Selection drives the detail">
        <p>
          The split view does not own a selection. Pass the open item’s pages as <C>detail</C> (first
          page first, each with a key) and nothing when no item is open. <C>onBack</C> removes the top
          detail page; when it is the first one, clear the selection.
        </p>
        <Code
          code={`const [selected, setSelected] = useState<number | null>(null)

<SplitView
  label="Orders"
  onBack={() => setSelected(null)}
  placeholder={<SplitPlaceholder icon={<Inbox />} title="Select an order" />}
  list={
    <NavigationPage key="orders" title="Orders">
      {orders.map((o) => (
        <ListRow key={o.id} title={o.name} selected={o.id === selected} onClick={() => setSelected(o.id)} />
      ))}
    </NavigationPage>
  }
  detail={selected && <NavigationPage key={selected} title={\`Order #\${selected}\`}>…</NavigationPage>}
/>`}
        />
      </Section>

      <Section title="Two layouts">
        <Table
          head={['', 'Wide (≥ compactBreakpoint)', 'Narrow']}
          rows={[
            ['List', 'A column, default 360px, resizable 280–520px', 'The root page of a stack'],
            ['Open item', 'The detail column; switching items cross-fades', 'Pushed over the list; swipe back'],
            ['Deeper pages', 'Pushed inside the detail column', 'Pushed on the same stack'],
            ['Nothing open', 'placeholder', 'Just the list'],
          ]}
        />
        <p>
          The breakpoint is measured on the split view’s own width, not the window, so a split view
          inside a narrow panel collapses too.
        </p>
      </Section>

      <Section title="Resizing">
        <p>
          The hairline between the columns is a separator. Drag it with any pointer (it rubber-bands
          past the limits and springs back on release), double-click it to reset, or focus it and use
          the arrow keys, <kbd>Home</kbd> and <kbd>End</kbd>. Persist the width with{' '}
          <C>onListWidthChange</C> if people expect it to stay.
        </p>
        <DoDont
          doItems={['Show the open row as selected in the list (ListRow selected) on wide screens.']}
          dontItems={['Show chevrons on wide screens: the item opens beside the list, not on top of it.']}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'split-view',
  title: 'Split view',
  group: 'Navigation and layout',
  order: 1,
  summary: 'A list beside its detail on wide screens that becomes a navigation stack on phones.',
  importLine: "import { SplitView, SplitPlaceholder } from '@feeef.dev/ui/containers'",
  source: 'src/containers/split-view.tsx',
  api: ['SplitView', 'SplitPlaceholder'],
  keywords: ['master detail', 'list detail', 'two pane', 'columns', 'inbox', 'ipad', 'resizable'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
