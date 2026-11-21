import { useState, type ReactNode } from 'react'
import { Download, ListFilter, Phone, Plus, Search, X } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { definePage } from '../../../src/model'
import { Link } from '../../../src/router'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Compare } from '../_lib/compare'
import { DemoScreen, Marker, useWidth } from './frame'
import { OrderWorkspace } from './workspace-demo'
import './layout.css'

const ORDERS = [
  { id: '#1048', name: 'Amina Benali', city: 'Alger', total: '9 600 DA' },
  { id: '#1047', name: 'Yacine Haddad', city: 'Oran', total: '2 900 DA' },
  { id: '#1046', name: 'Sara Meziane', city: 'Constantine', total: '7 200 DA' },
  { id: '#1045', name: 'Karim Saidi', city: 'Blida', total: '3 100 DA' },
  { id: '#1044', name: 'Lina Cherif', city: 'Sétif', total: '5 650 DA' },
  { id: '#1043', name: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA' },
]

function Rows({ check }: { check?: string[] }) {
  return (
    <div className="gl-mini-rows">
      {ORDERS.map((order) => (
        <div key={order.id} className="gl-mini-row">
          <span>
            <strong>
              {order.id} · {order.name}
            </strong>
            <small>
              {order.city} · {order.total}
            </small>
          </span>
          {check && <Checkbox controlSize="small" aria-label={`Select order ${order.id}`} defaultChecked={check.includes(order.id)} />}
        </div>
      ))}
    </div>
  )
}

const toolIcon = (label: string, icon: ReactNode) => (
  <IconButton variant="text" appearance="toolbar" aria-label={label}>
    {icon}
  </IconButton>
)

/* ---------- Anatomy ---------- */

function Anatomy() {
  // Narrow columns get a smaller pretend screen so the parts stay legible.
  const [ref, available] = useWidth<HTMLDivElement>()
  const screen = available && available < 600 ? 720 : 960
  return (
    <div ref={ref}>
      <DemoScreen width={screen} height={540} label="Anatomy of a Feeef screen">
        <OrderWorkspace screenWidth={screen} markers alwaysTitle inspector />
        <span className="gl-ground-marker">
          <Marker n={1} />
        </span>
      </DemoScreen>
      <ol className="gl-legend">
        {[
          ['Ground', 'the tinted pixel background behind the workspace.'],
          ['Sidebar', 'navigation on an inset glass surface. Expanded, rail, hidden or a drawer.'],
          ['Navigation and identity bubble', 'the menu toggle and the logo, once the sidebar is too small to hold them.'],
          ['Title bubble', 'the page name, when the large title is not on screen.'],
          ['Page views bubble', 'switches between views of the same thing (Order, Calls).'],
          ['Tools bubble', 'actions on the whole page: print, search, open details.'],
          ['Main viewport', 'the edge-to-edge reading area. Secondary panels carry their own surfaces.'],
          ['Inspector', 'details of the thing in front of you, at the end of the reading direction.'],
          ['Dock', 'the task’s actions, with the one primary action, floating at the bottom.'],
        ].map(([name, text], i) => (
          <li key={name}>
            <Marker n={i + 1} />
            <span>
              <strong>{name}</strong>: {text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------- Bubbles ---------- */

function GoodBubbles() {
  return (
    <div className="gl-mini">
      <ScrollArea
        label="Orders"
        edgeGap={8}
        contentPadding={8}
        top={
          <Toolbar
            label="Orders toolbar"
            leading={
              <ToolbarGroup label="Page title">
                <span className="gl-mini-title">Orders</span>
              </ToolbarGroup>
            }
            trailing={
              <ToolbarGroup label="Order tools">
                {toolIcon('Search orders', <Search />)}
                {toolIcon('Filter orders', <ListFilter />)}
                {toolIcon('Export orders', <Download />)}
              </ToolbarGroup>
            }
          />
        }
      >
        <Rows />
      </ScrollArea>
    </div>
  )
}

function BadPainted() {
  return (
    <div className="gl-mini" style={{ gridTemplateRows: 'auto minmax(0, 1fr)' }}>
      <div className="gl-painted-bar">
        <strong>Orders</strong>
        <div>
          <IconButton variant="outlined" controlSize="small" aria-label="Search orders">
            <Search />
          </IconButton>
          <IconButton variant="outlined" controlSize="small" aria-label="Filter orders">
            <ListFilter />
          </IconButton>
          <IconButton variant="outlined" controlSize="small" aria-label="Export orders">
            <Download />
          </IconButton>
        </div>
      </div>
      <div className="gl-mini-scroll">
        <Rows />
      </div>
    </div>
  )
}

/* ---------- Floating chrome ---------- */

function BadStacked() {
  return (
    <div className="gl-mini" data-stack>
      <div className="gl-painted-bar">
        <strong>Orders</strong>
        <Button variant="filled" controlSize="small">
          <Plus />
          New order
        </Button>
      </div>
      <div className="gl-painted-bar">
        <TextField hint="Search orders" controlSize="small" containerClassName="gl-grow" />
        <div>
          <Button variant="outlined" controlSize="small">
            Wilaya
          </Button>
          <Button variant="outlined" controlSize="small">
            Courier
          </Button>
        </div>
      </div>
      <div className="gl-mini-scroll">
        <Rows />
      </div>
    </div>
  )
}

function GoodFloating() {
  return (
    <div className="gl-mini">
      <ScrollArea
        label="Orders"
        edgeGap={8}
        contentPadding={8}
        top={
          <Toolbar
            label="Orders toolbar"
            leading={
              <ToolbarGroup label="Page title">
                <span className="gl-mini-title">Orders</span>
              </ToolbarGroup>
            }
            trailing={
              <ToolbarGroup label="Order tools">
                {toolIcon('Search orders', <Search />)}
                {toolIcon('Filter orders', <ListFilter />)}
              </ToolbarGroup>
            }
          />
        }
        bottom={
          <Dock label="Order actions">
            <Button variant="filled" controlSize="small">
              <Plus />
              New order
            </Button>
          </Dock>
        }
      >
        <Rows />
      </ScrollArea>
    </div>
  )
}

/* ---------- Dock ---------- */

function GoodDock() {
  return (
    <div className="gl-mini">
      <ScrollArea
        label="Orders to confirm"
        edgeGap={8}
        contentPadding={8}
        bottom={
          <Dock label="Selected orders" content={<span className="gl-dock-status">2 selected</span>}>
            <div className="gl-dock-row">
              <IconButton variant="text" appearance="toolbar" aria-label="Clear selection">
                <X />
              </IconButton>
              <Button variant="filled">
                Confirm 2 orders
              </Button>
            </div>
          </Dock>
        }
      >
        <Rows check={['#1048', '#1046']} />
      </ScrollArea>
    </div>
  )
}

function BadScattered() {
  return (
    <div className="gl-mini">
      <div className="gl-mini-scroll">
        {ORDERS.slice(0, 4).map((order) => (
          <div key={order.id} className="gl-mini-row">
            <span>
              <strong>
                {order.id} · {order.name}
              </strong>
              <small>{order.total}</small>
            </span>
            <span style={{ display: 'flex', gap: 4 }}>
              <IconButton variant="outlined" controlSize="small" aria-label={`Call ${order.name}`}>
                <Phone />
              </IconButton>
              <Button variant="filled" controlSize="small">
                Confirm
              </Button>
              <Button variant="destructive" controlSize="small">
                Cancel
              </Button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Responsive ---------- */

const STEPS: { min: number; text: string }[] = [
  { min: 1200, text: 'Sidebar expanded with the logo. Page views and tools in the app bar, inspector beside the content.' },
  { min: 1024, text: 'Sidebar becomes a rail; the logo rises into a navigation bubble in the app bar. The inspector still fits.' },
  { min: 720, text: 'The inspector moves into a pane sheet behind the “Order details” tool (a sheet on phones). Everything else stays put.' },
  { min: 0, text: 'Phone: the sidebar opens as a drawer, page views join the main action in the bottom dock, and “Call customer” moves into the tools bubble.' },
]

function ResponsiveDemo() {
  const [width, setWidth] = useState(1280)
  const step = STEPS.find((s) => width >= s.min)!
  return (
    <div className="gl-resize">
      <div className="gl-resize-head">
        <span aria-hidden="true">Screen width</span>
        <output aria-hidden="true">{width} px</output>
      </div>
      <Slider
        label="Screen width"
        min={360}
        max={1440}
        step={10}
        value={width}
        onValueChange={setWidth}
        getValueText={(value) => `${value} pixels`}
        marks={[
          { value: 390, label: 'Phone' },
          { value: 768, label: 'Tablet' },
          { value: 1024, label: 'Laptop' },
          { value: 1280, label: 'Desktop' },
        ]}
      />
      <p className="gl-resize-state" role="status">
        {step.text}
      </p>
      <DemoScreen width={width} height={600} label={`Order screen at ${width} pixels wide`}>
        <OrderWorkspace screenWidth={width} />
      </DemoScreen>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Every Feeef screen is built from the same few parts, always in the same places. Learn the anatomy
        once and every app reads the same: navigation at the start, the work in the middle, details at the
        end, and tools floating over it all.
      </Lead>

      <Section title="Anatomy">
        <p>
          A screen is a <Link to="/components/scaffold">Scaffold</Link>: a glass sidebar and an edge-to-edge viewport on
          a tinted ground. The app bar and the dock float over the content panel; they are not rows that
          push it down. This is the real order screen of a merchant app, scaled down. Click around: the
          sidebar toggle, the views and the dock all work.
        </p>
        <Anatomy />
      </Section>

      <Section title="Bubbles">
        <p>
          The app bar is not a bar. It is an unpainted row of glass bubbles (
          <Link to="/components/toolbar">ToolbarGroup</Link>), one per purpose, with the content showing
          between them. A bubble groups the controls people look for together (
          <Link to="/guidelines/principles#tools-travel-together">related tools travel together</Link>), and
          the empty space between bubbles lets the content breathe (
          <Link to="/guidelines/principles#content-first">content first</Link>).
        </p>
        <Table
          head={['Place', 'Bubble', 'Holds', 'When']}
          rows={[
            ['Start', 'Navigation and identity', 'Sidebar toggle, logo or store name, back button', 'Only when the sidebar can’t show them (rail, hidden, drawer) or on a sub-page'],
            ['Start, after it', 'Title', 'The page or record name, short', 'When the large title in the content has scrolled away, or there is none'],
            ['End', 'Page views', <>One <C>SegmentedControl</C></>, 'Two to five views of the same thing; drops to the dock on phones'],
            ['End, last', 'Tools', 'Icon buttons that act on the whole page: search, print, details, more', 'Always; overflow into a menu when full'],
          ]}
        />
        <p>
          Read the order from the reading direction, not from the left: in Arabic the navigation bubble is
          on the right. The page’s main action is not in the app bar; it goes in the dock (see{' '}
          <a href="#actions-go-in-a-dock">below</a>).
        </p>
        <Code
          code={`<ScaffoldAppBar
  leading={
    <ToolbarGroup label="Navigation">
      <ScaffoldToggleButton action="drawer" />
      <StoreBrand />
    </ToolbarGroup>
  }
  trailing={
    <>
      <ToolbarGroup label="Page views">
        <SegmentedControl label="Order views" value={view} onChange={setView} options={VIEWS} />
      </ToolbarGroup>
      <ToolbarGroup label="Order tools">
        <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Print label">
          <Printer />
        </IconButton>
      </ToolbarGroup>
    </>
  }
>
  <ToolbarGroup label="Page title">
    <span>Order #1048</span>
  </ToolbarGroup>
</ScaffoldAppBar>`}
        />
        <Compare
          good={<GoodBubbles />}
          goodNote="Bubbles float over the list; rows stay visible between and under them."
          bad={<BadPainted />}
          badNote="A full-width painted bar: a second surface that eats a row and splits the panel in two."
        />
      </Section>

      <Section title="Floating chrome and reservations">
        <p>
          Content scrolls under the floats, and a soft wash fades it where it meets them. At rest, nothing
          is covered: <Link to="/components/scroll-area">ScrollArea</Link> measures every float and
          reserves exactly that much room at the top and bottom, plus the gaps. When a dock grows (a
          selection appears, a button label changes), the reservation follows.
        </p>
        <ul>
          <li>
            Pass chrome through <C>top</C> / <C>bottom</C> (or the scaffold’s <C>appBar</C> / <C>bottom</C>).
            Don’t position it yourself.
          </li>
          <li>
            Never add spacer elements or <C>padding-bottom: 96px</C> to clear a dock. Hardcoded spacers
            are wrong on the first font change, the first translation and the first phone with a safe area.
          </li>
          <li>One scroll area per region. Don’t nest a scrolling list inside a scrolling page for the same task.</li>
          <li>
            One spacing rhythm: the shell gap <strong>G</strong> (<C>--lab-shell-gap</C>, 8px) between
            every chrome neighbour (window, top bar, panel, sidebar items, toolbar groups, a floating bar
            and its panel’s sides, floats and content and the panel edge), 16px inside cards. Change it
            once with <C>metrics.shellGap</C>; never pick a gap per screen.
          </li>
        </ul>
        <Code
          code={`// Do: the scroll area measures the floats and reserves their room.
<ScrollArea label="Orders" top={<OrdersToolbar />} bottom={<Dock label="Order actions">…</Dock>}>
  <OrdersList />
</ScrollArea>

// Don't: a fixed header and a magic spacer that is wrong on the next device.
<header style={{ position: 'sticky', top: 0 }}>…</header>
<OrdersList />
<div style={{ height: 108 }} />`}
        />
        <Compare
          good={<GoodFloating />}
          goodNote="One floating app bar and a dock: the list gets the whole panel."
          bad={<BadStacked />}
          badNote="A header bar, then a filter bar, then the list: two painted rows before the first order."
        />
      </Section>

      <Section title="Actions go in a dock">
        <p>
          The actions of the task in front of people (confirm, ship, save) float in a{' '}
          <Link to="/components/dock">Dock</Link> at the bottom of the content, where a thumb reaches them
          and where they are in the same place on every screen. The dock holds the{' '}
          <Link to="/guidelines/principles#one-primary-action">one primary action</Link>. When a selection
          starts, the dock changes to act on the selection; it does not add buttons to each row. When
          actions don’t fit, use <Link to="/components/actions-bar">ActionsBar</Link> inside the dock so
          the low-priority ones move into a menu.
        </p>
        <Compare
          good={<GoodDock />}
          goodNote="Select rows, act once from the dock. One filled button, in one place."
          bad={<BadScattered />}
          badNote="Every row carries three buttons: twelve targets, four filled, and the list is unreadable."
        />
      </Section>

      <Section title="Responsive collapse">
        <Callout title="Nothing disappears, it moves">
          <p>
            As the screen narrows, each part moves to its smaller home in a fixed order. People who switch
            from a laptop to a phone find every control again, one step away. Never hide a feature at a
            breakpoint.
          </p>
        </Callout>
        <Table
          head={['Screen', 'Sidebar and logo', 'Page views', 'Inspector']}
          rows={[
            ['≥ 1200px', 'Expanded (304px), logo in it', 'App bar', 'Beside the content'],
            ['1024–1199px', 'Rail (64px); the logo rises into the app bar', 'App bar', 'Beside the content'],
            ['720–1023px', 'Rail, or hidden by the user', 'App bar', 'A dialog behind a tool'],
            ['< 720px', 'Drawer; logo and menu toggle in the app bar', 'Bottom dock', 'A dialog or sheet'],
          ]}
        />
        <p>
          The main action never moves: it is in the dock at every width.
        </p>
        <p>
          The scaffold measures its own width, not the window, so the same screen adapts inside a split view
          or a preview pane. On every width, the large page title collapses into a small title bubble once
          it scrolls under the app bar, like the title of this page does. Drag the width below; the demo is
          a real scaffold laid out at that width and scaled to fit.
        </p>
        <ResponsiveDemo />
        <p>
          The order of collapse follows{' '}
          <Link to="/guidelines/principles#navigation-work-details">navigation, work, details</Link>: details
          give way first, navigation next, and the work itself never moves. These docs follow the same rules;
          narrow your window to watch the sidebar, logo and page views move.
        </p>
      </Section>

      <Section title="Surfaces and glass">
        <p>
          Two materials do all the work (see <Link to="/foundations/materials">Materials</Link>). Choose by
          what the thing is, not by how you want it to look.
        </p>
        <Table
          head={['Material', 'Use it for', 'Never for']}
          rows={[
            ['Ground', 'The page and main reading area', 'Floating controls'],
            ['Surface (opaque)', 'Cards, rows, forms, dialogs and the inspector', 'Floating tools'],
            ['Glass (ToolbarGroup, Dock, GlassGroup)', 'Navigation sidebar, app bar bubbles and docks', 'Content, long text, forms, whole panels'],
          ]}
        />
      </Section>

      <Section title="Checklist">
        <DoDont
          doItems={[
            'One scaffold per page; every page’s content scrolls in its content panel.',
            'One bubble per purpose, in reading order: navigation, title … views, tools.',
            'Task actions and the one primary action in the bottom dock.',
            'Let ScrollArea reserve room for every float.',
            'One shell gap G between chrome neighbours, 16 inside cards.',
            'Move things to their smaller home as the screen narrows; check every screen at 390px and in Arabic.',
          ]}
          dontItems={[
            'Stack fixed header bars, or paint a toolbar edge to edge.',
            'Hardcode spacers or bottom padding for docks.',
            'Put buttons on every row when people can select rows and act once.',
            'Hide a feature at a breakpoint.',
            'Put content on glass, or chrome on its own opaque card.',
          ]}
        />
        <p>
          Ready-made screens built from these parts are in <Link to="/guidelines/patterns">Page patterns</Link>.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'layout',
  title: 'Layout',
  order: 2,
  summary:
    'The anatomy of a Feeef screen: ground, sidebar, content panel, floating bubbles and dock, and how each part moves as the screen narrows.',
  keywords: ['anatomy', 'app bar', 'bubbles', 'responsive', 'breakpoints', 'inspector', 'dock', 'sidebar', 'rail', 'drawer', 'collapse'],
  Overview,
})
