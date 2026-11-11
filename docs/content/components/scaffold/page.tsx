import { Package, Plus, ShoppingBag, Truck } from 'lucide-react'
import {
  Scaffold,
  ScaffoldAppBar,
  ScaffoldSide,
  ScaffoldToggleButton,
  type ScaffoldSideMode,
} from '@feeef.dev/ui/workspace/scaffold'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
]

const controls = {
  sideMode: { type: 'select', label: 'Default side mode', options: ['expanded', 'rail', 'hidden'], default: 'expanded' },
  layout: { type: 'select', options: ['auto', 'wide', 'compact'], default: 'auto' },
  dir: { type: 'select', label: 'Direction', options: ['ltr', 'rtl'], default: 'ltr' },
  appBar: { type: 'boolean', label: 'App bar', default: true },
  bottom: { type: 'boolean', label: 'Bottom dock', default: true },
} as const

function PlaygroundScaffold(v: {
  sideMode: string
  layout: string
  dir: string
  appBar: boolean
  bottom: boolean
}) {
  return (
    <div className="scaffold-demo-frame" style={{ height: 360 }}>
      <Scaffold
        key={v.sideMode}
        compactBreakpoint={560}
        dir={v.dir as 'ltr' | 'rtl'}
        defaultSideMode={v.sideMode as ScaffoldSideMode}
        compact={v.layout === 'auto' ? undefined : v.layout === 'compact'}
        side={(state) => {
          const rail = state.sideMode === 'rail' && !state.drawerOpen
          return (
            <ScaffoldSide
              leading={
                <div className="scaffold-demo-brand">
                  {!rail && <strong>Atlas Store</strong>}
                  {!state.drawerOpen && <ScaffoldToggleButton />}
                </div>
              }
            >
              <nav aria-label="Store pages" className="scaffold-demo-nav">
                {PAGES.map((item, index) => (
                  <NavigationItem
                    key={item.label}
                    compact={rail}
                    label={item.label}
                    icon={item.icon}
                    active={index === 0}
                    onSelect={() => state.setDrawerOpen(false)}
                  />
                ))}
              </nav>
            </ScaffoldSide>
          )
        }}
        appBar={
          v.appBar
            ? (state) => (
                <ScaffoldAppBar
                  leading={
                    (state.compact || state.sideMode === 'hidden') && (
                      <ToolbarGroup label="Navigation">
                        <ScaffoldToggleButton />
                      </ToolbarGroup>
                    )
                  }
                >
                  <ToolbarGroup label="Current page">
                    <span className="scaffold-demo-title">Orders</span>
                  </ToolbarGroup>
                </ScaffoldAppBar>
              )
            : undefined
        }
        bottom={
          v.bottom ? (
            <Dock label="Order actions">
              <Button variant="filled">
                <Plus />
                New order
              </Button>
            </Dock>
          ) : undefined
        }
      >
        <div className="scaffold-demo-list">
          {['#1048 · Amina Benali', '#1047 · Yacine Haddad', '#1046 · Sara Meziane', '#1045 · Karim Saidi', '#1044 · Lina Cherif'].map(
            (row) => (
              <div key={row} className="scaffold-demo-row">
                <span>
                  <strong>{row}</strong>
                  <small>Cash on delivery</small>
                </span>
              </div>
            )
          )}
        </div>
      </Scaffold>
    </div>
  )
}

function playgroundCode(v: { sideMode: string; layout: string; dir: string; appBar: boolean; bottom: boolean }) {
  const props = [
    v.sideMode !== 'expanded' && `  defaultSideMode="${v.sideMode}"`,
    v.layout !== 'auto' && `  compact={${v.layout === 'compact'}}`,
    v.dir !== 'ltr' && `  dir="${v.dir}"`,
    '  side={(state) => <StoreSidebar rail={state.sideMode === \'rail\'} />}',
    v.appBar && '  appBar={<ScaffoldAppBar leading={<ScaffoldToggleButton />}>Orders</ScaffoldAppBar>}',
    v.bottom && '  bottom={<Dock label="Order actions">…</Dock>}',
  ].filter(Boolean)
  const body = `<Scaffold\n${props.join('\n')}\n>\n  <OrdersList />\n</Scaffold>`
  return `<div style={{ height: '100dvh' }}>\n  ${body.split('\n').join('\n  ')}\n</div>`
}

function Anatomy() {
  return (
    <div className="scaffold-anatomy" role="img" aria-label="Scaffold anatomy: top row, sidebar, and a content panel with a floating app bar, content and a bottom dock">
      <div className="scaffold-anatomy-box">
        <b>1</b> topSide
      </div>
      <div className="scaffold-anatomy-row">
        <div className="scaffold-anatomy-box">
          <b>2</b> side
        </div>
        <div className="scaffold-anatomy-panel">
          <div className="scaffold-anatomy-box" data-float>
            <b>3</b> appBar
          </div>
          <div className="scaffold-anatomy-box">
            <b>4</b> children (scrolls)
          </div>
          <div className="scaffold-anatomy-box" data-float>
            <b>5</b> bottom
          </div>
        </div>
      </div>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground controls={controls} render={(v) => <PlaygroundScaffold {...v} />} code={playgroundCode} />

      <Section title="Anatomy">
        <p>
          <C>Scaffold</C> is the frame of a workspace page. It is pure structure: it draws the tinted
          ground, sizes the sidebar and the content panel, and floats chrome over the content. It never
          renders a logo, an account menu or routes; you pass those in as slots.
        </p>
        <Anatomy />
        <ol>
          <li>
            <strong>Top row</strong> (<C>topSide</C>): optional full-width row above everything, usually a{' '}
            <C>ScaffoldTopBar</C>. Empty means no row.
          </li>
          <li>
            <strong>Sidebar</strong> (<C>side</C>): usually a <C>ScaffoldSide</C>, transparent on the
            ground. 304px expanded, 64px as a rail, or hidden. In compact layouts it moves into a drawer.
          </li>
          <li>
            <strong>App bar</strong> (<C>appBar</C>): floats over the top of the content panel, usually a{' '}
            <C>ScaffoldAppBar</C> with <C>ToolbarGroup</C>s.
          </li>
          <li>
            <strong>Content</strong> (<C>children</C>): the only part that scrolls. It sits in one rounded,
            opaque panel inset 8px from the ground, inside a <C>ScrollArea</C> that reserves room for the
            floats so the first and last rows can always scroll clear of them.
          </li>
          <li>
            <strong>Bottom</strong> (<C>bottom</C>): floats over the bottom of the content panel, usually a{' '}
            <C>Dock</C> with the page's main action.
          </li>
        </ol>
      </Section>

      <Section title="Sidebar modes">
        <Table
          head={['Mode', 'Width', 'Use it for']}
          rows={[
            [<C>expanded</C>, '304px (248px in compact density)', 'The default. Icons and labels, room for a brand and an account tile.'],
            [<C>rail</C>, '64px (52px in compact density)', 'More room for content while keeping navigation one click away. Render NavigationItem with compact so labels become tooltips.'],
            [<C>hidden</C>, '0', 'Focused editors. Keep a way back: a toggle in the app bar or a top row.'],
          ]}
        />
        <p>
          The mode is uncontrolled by default (<C>defaultSideMode</C>). To remember it, control it with{' '}
          <C>sideMode</C> and <C>onSideModeChange</C>, which fires for every change, including the toggle
          button. The width animates; the sidebar's content fades and becomes inert while hidden.
        </p>
      </Section>

      <Section title="Compact layout and the drawer">
        <p>
          The scaffold measures its own width, not the window. Below <C>compactBreakpoint</C> (720px) it
          drops the sidebar column and renders <C>side</C> in a modal drawer attached to the start edge,
          up to 320px wide. <C>ScaffoldToggleButton</C> opens it, and its state is{' '}
          <C>drawerOpen</C> / <C>setDrawerOpen</C>. Close the drawer yourself when a navigation item is
          chosen. Pass <C>compact</C> to force either layout, for example in an embedded preview.
        </p>
      </Section>

      <Section title="State and function slots">
        <p>
          Every slot accepts either a node or a function of the scaffold state, so the sidebar can switch
          its items to rail mode and the app bar can show a toggle only when the sidebar is out of view.
          Components rendered inside the scaffold can read the same state with <C>useScaffold()</C>.
        </p>
        <Code
          code={`const { compact, sideMode, setSideMode, cycleSide, drawerOpen, setDrawerOpen, sideId } =
  useScaffold()

<Scaffold
  side={(state) => <StoreSidebar rail={state.sideMode === 'rail' && !state.drawerOpen} />}
  appBar={(state) => (
    <ScaffoldAppBar
      leading={(state.compact || state.sideMode === 'hidden') && <ScaffoldToggleButton />}
    >
      Orders
    </ScaffoldAppBar>
  )}
>
  <OrdersList />
</Scaffold>`}
        />
        <Table
          head={['Toggle action', 'What it does']}
          rows={[
            [<C>cycle</C>, 'Default. Steps expanded → rail → hidden → expanded. In compact layouts it opens the drawer.'],
            [<C>restore</C>, 'Expands the sidebar. Use it in a top row or app bar shown while the sidebar is hidden.'],
            [<C>drawer</C>, 'Always opens the drawer.'],
          ]}
        />
      </Section>

      <Section title="Sizing">
        <p>
          A scaffold fills its parent's height (<C>height: 100%</C>), so give the parent a bounded height,
          usually <C>100dvh</C> for a page. If the parent grows with its content, the content panel cannot
          scroll. Use <C>renderViewport</C> when a page already owns a <C>ScrollArea</C> (for example an
          editor that needs the viewport ref); it receives the rendered <C>appBar</C> and <C>bottom</C> to
          float itself.
        </p>
        <p>
          <C>contentSurface?: 'card' | 'none'</C> defaults to <C>card</C>, preserving the outer content
          surface even with <C>renderViewport</C> (an editor may still need it). For a <C>PanelHost</C>
          whose independent <C>Panel</C>s paint their own surfaces, set <C>contentSurface="none"</C>:
          the viewport becomes transparent with no border, radius or shadow. Shell spacing and keyboard
          focus remain, including the shell gap when the sidebar is hidden or compact. Each panel keeps
          its own paint; this prop changes only the scaffold's outer viewport.
        </p>
        <Callout title="One scaffold per page">
          <p>
            Nest pages inside the content, not scaffolds inside scaffolds. Dialogs and sheets have their own
            scroll areas (<C>Modal scrollable</C>).
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Put the page title and page actions in the app bar, and the one main action in the bottom dock.',
            'Render navigation items in rail mode when the sidebar is a rail.',
            'Keep a way back to the sidebar when it is hidden: an app bar toggle or a top row.',
            'Close the drawer after a navigation choice.',
          ]}
          dontItems={[
            'Add bottom padding to make room for the dock; the scroll area measures it for you.',
            'Make the sidebar opaque or give it its own card; it sits on the ground.',
            'Put scrolling content in the sidebar and the content panel at the same time for the same task.',
            'Wrap the scaffold in a parent without a bounded height.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The content scroll area is a focusable region named by <C>contentLabel</C>, so keyboard users can
          scroll it. When the sidebar is about to hide while it holds focus, focus moves to the content
          panel first, so it never lands on an inert element. The hidden sidebar is <C>inert</C> and <C>aria-hidden</C>. The toggle
          button names what it will do (“Minimize workspace sidebar”, “Expand workspace sidebar”, “Open
          workspace navigation”), sets <C>aria-expanded</C> and points <C>aria-controls</C> at the sidebar.
          The compact drawer is a modal dialog named by <C>drawerLabel</C>: it traps focus, closes on Escape
          or a backdrop click, and returns focus to <C>drawerReturnFocusRef</C> or the opener.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves through the top row, sidebar, app bar, content and dock in reading order.'],
            ['Enter', 'Activates the toggle button.'],
            ['Escape', 'Closes the compact drawer.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'scaffold',
  title: 'Scaffold',
  group: 'Navigation and layout',
  order: 1,
  summary:
    'The workspace frame: a sidebar that expands, collapses to a rail or hides, and one content panel with floating app bar and dock.',
  importLine:
    "import { Scaffold, ScaffoldSide, ScaffoldAppBar, ScaffoldToggleButton } from '@feeef.dev/ui/workspace/scaffold'",
  source: 'src/workspace/scaffold.tsx',
  api: ['Scaffold', 'ScaffoldSide', 'ScaffoldAppBar', 'ScaffoldTopBar', 'ScaffoldToggleButton'],
  keywords: ['layout', 'sidebar', 'rail', 'drawer', 'app bar', 'shell', 'workspace', 'useScaffold'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <span className="scaffold-preview">
      <span>
        <i />
        <i />
        <i />
      </span>
      <span>
        <i />
        <i />
        <i />
      </span>
    </span>
  ),
})
