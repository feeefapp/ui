import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          Tabs are an app’s top-level destinations on a phone: two to five places people move between
          all day, like Orders, Inbox, Products and Settings. Each tab is its own world with its own{' '}
          <Link to="/components/navigation-stack">navigation stack</Link>, so switching tabs never loses
          where the person was.
        </p>
        <p>
          On wide screens the same destinations usually belong in the scaffold’s sidebar. To switch
          views of one thing (list or board, overview or API), use a segmented control instead.
        </p>
      </Section>

      <Section title="Tabs keep their state">
        <p>
          A tab’s content mounts the first time it is opened and stays mounted, hidden and inert, while
          other tabs show. Scroll positions, pushed pages and drafts are still there when the person
          comes back. Pick the current tab again and it returns to the top (or pass{' '}
          <C>onReselect</C> to pop its stack to the root, as iOS does).
        </p>
        <Code
          code={`const [tab, setTab] = useState('orders')

<TabView
  label="Store"
  value={tab}
  onChange={setTab}
  tabs={[
    { id: 'orders', label: 'Orders', icon: <ShoppingBag />, badge: 8, content: <OrdersStack /> },
    { id: 'inbox', label: 'Inbox', icon: <MessageSquare />, content: <InboxStack /> },
    { id: 'settings', label: 'Settings', icon: <Settings />, content: <SettingsStack /> },
  ]}
/>`}
        />
      </Section>

      <Section title="The bar steps aside">
        <Table
          head={['Moment', 'Bar']}
          rows={[
            ['At rest, or scrolling up', 'Full: every tab with icon and label.'],
            ['Scrolling down through content', 'Shrinks to the selected tab’s icon so content gets the screen; the accessory moves beside it.'],
            ['Tap on the small bar, or back at the top', 'Springs back to full.'],
          ]}
        />
        <p>
          The bar’s height is reserved in every scroll area inside the tabs, so the last row and any
          page dock sit above it. <C>{'minimize="never"'}</C> keeps it full. <C>accessory</C> holds one
          persistent control, such as a call in progress.
        </p>
        <DoDont
          doItems={['Use one-word labels with a clear icon each.', 'Show counts that need action as a badge.']}
          dontItems={['Use tabs for actions (“New order”) or for more than five destinations.', 'Hide the bar on a pushed page; it stays so people can always switch.']}
        />
      </Section>

      <Section title="Accessibility">
        <ul>
          <li>The bar is a tab list; arrow keys, <kbd>Home</kbd> and <kbd>End</kbd> move between tabs.</li>
          <li>Badges are read with the tab’s name.</li>
          <li>Hidden tabs are inert; reduced motion switches instantly and shrinks without movement.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'tab-view',
  title: 'Tab view',
  group: 'Navigation and layout',
  order: 2,
  summary: 'Top-level tabs that keep their state, with a floating tab bar that shrinks while content scrolls.',
  importLine: "import { TabView } from '@feeef.dev/ui/containers'",
  source: 'src/containers/tab-view.tsx',
  api: ['TabView'],
  keywords: ['tabs', 'tab bar', 'bottom navigation', 'ios', 'minimize', 'accessory'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
