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
          On wide screens the same destinations usually belong in the scaffold’s sidebar. In Flutter, set showBar: false on the same TabView instance so its visited panels, navigation stacks and drafts stay mounted while the floating bar and its scroll reservation disappear. To switch
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
    { id: 'orders', label: 'Orders', icon: <ShoppingBag />, badge: '8', content: <OrdersStack /> },
    { id: 'inbox', label: 'Inbox', icon: <MessageSquare />, content: <InboxStack /> },
    { id: 'settings', label: 'Settings', icon: <Settings />, content: <SettingsStack /> },
  ]}
/>`}
        />
      </Section>

      <Section title="Badges and dragging">
        <p>
          The tab bar is a <Link to="/components/segmented-control">segmented control</Link> with tab
          semantics: the same selection (the switch’s thumb: a light capsule with ink text), glass lens
          and physics. A tap opens a tab. Press the selected tab and it turns into the switch’s lens:
          with <C>liquid</C> glass a clear drop 8px taller than the pill on each side that sticks out
          of the bar, and the tab under it grows 1.2× (its icon and label, not the glass). Drag it across the
          bar (or press another tab and drag, and the lens comes to you) and the tab under it when you
          let go opens, never one on the way.
          A quick flick carries on to the next tab. Right to left, the bar and the drag mirror.
        </p>
        <p>
          <C>badge</C> puts a short count on a tab’s icon, for something that needs action, like
          orders to confirm. It is read with the tab’s name (“Orders, 5”). Pass <C>undefined</C> when
          there is nothing to count; a badge that always says something stops being read.
        </p>
      </Section>

      <Section title="The bar steps aside">
        <Table
          head={['Moment', 'Bar']}
          rows={[
            ['At rest, or scrolling up', 'Full: every tab with icon and label.'],
            ['Scrolling down through content', 'Shrinks to the selected tab’s icon so content gets the screen; the accessory moves beside it.'],
            ['Tap on the small bar, or back at the top', 'Springs back to full. The small bar can’t be dragged.'],
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
          <li>
            The bar is a tab list with one Tab stop. <kbd>←</kbd> and <kbd>→</kbd> (mirrored right to
            left), <kbd>Home</kbd> and <kbd>End</kbd> move to a tab and open it; <kbd>Enter</kbd> or{' '}
            <kbd>Space</kbd> on the open tab returns it to the top. <kbd>↑</kbd> and <kbd>↓</kbd> are
            left to the page.
          </li>
          <li>Badges are read with the tab’s name. Dragging is never the only way: every tab is a tap or a key away.</li>
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
  keywords: ['tabs', 'tab bar', 'bottom navigation', 'ios', 'minimize', 'accessory', 'badge', 'drag', 'lens'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
