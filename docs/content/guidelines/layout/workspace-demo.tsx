import { useEffect, useRef, useState, type RefObject } from 'react'
import { PanelRight, Phone, PhoneCall, Package, Printer, ShoppingBag, Store, Truck, Users } from 'lucide-react'
import {
  Scaffold,
  ScaffoldAppBar,
  ScaffoldSide,
  ScaffoldToggleButton,
  type ScaffoldSideMode,
  type ScaffoldState,
} from '@feeef.dev/ui/workspace/scaffold'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Presence } from '@feeef.dev/ui/motion'
import { Marker } from './frame'
import './layout.css'

type View = 'order' | 'calls'

const NAV = [
  { label: 'Orders', icon: <ShoppingBag size={20} /> },
  { label: 'Confirmation calls', icon: <PhoneCall size={20} /> },
  { label: 'Products', icon: <Package size={20} /> },
  { label: 'Deliveries', icon: <Truck size={20} /> },
  { label: 'Customers', icon: <Users size={20} /> },
]

const LINES = [
  { name: 'Wireless earbuds Pro', qty: 1, price: '4 900 DA' },
  { name: 'Silicone case, black', qty: 2, price: '1 200 DA' },
  { name: 'USB-C fast charger', qty: 1, price: '1 700 DA' },
]

const CALLS = [
  { when: 'Today, 10:42', who: 'Nadia (agent)', result: 'No answer' },
  { when: 'Today, 09:15', who: 'Nadia (agent)', result: 'Asked to call back after 10:30' },
  { when: 'Yesterday, 18:03', who: 'Storefront', result: 'Order placed from Instagram' },
]

/** Sidebar mode follows the screen width; a click on the toggle wins until the width changes. */
function useSideMode(screenWidth: number) {
  const auto: ScaffoldSideMode = screenWidth >= 1200 ? 'expanded' : 'rail'
  const [override, setOverride] = useState<{ mode: ScaffoldSideMode; width: number } | null>(null)
  const mode = override && override.width === screenWidth ? override.mode : auto
  return [mode, (next: ScaffoldSideMode) => setOverride({ mode: next, width: screenWidth })] as const
}

/** True once the large page title has scrolled under the floating app bar. */
function useTitleAway(viewport: RefObject<HTMLDivElement | null>, title: RefObject<HTMLElement | null>) {
  const [away, setAway] = useState(false)
  useEffect(() => {
    const root = viewport.current
    if (!root) return
    const check = () => {
      const heading = title.current
      if (!heading) return
      const box = root.getBoundingClientRect()
      const scale = root.offsetWidth ? box.width / root.offsetWidth : 1
      const reserve = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
      setAway((heading.getBoundingClientRect().bottom - box.top) / scale < reserve)
    }
    check()
    root.addEventListener('scroll', check, { passive: true })
    return () => root.removeEventListener('scroll', check)
  }, [viewport, title])
  return away
}

function Brand({ short }: { short?: boolean }) {
  return (
    <span className="gl-brand">
      <Store size={18} aria-hidden="true" />
      {!short && <strong>Atlas Store</strong>}
      {short && <strong>Atlas</strong>}
    </span>
  )
}

function Inspector({ markers }: { markers: boolean }) {
  return (
    <dl className="gl-facts">
      {[
        ['Status', 'Waiting for confirmation'],
        ['Customer', 'Amina Benali'],
        ['Phone', '0555 12 34 56'],
        ['Wilaya', '16 · Alger'],
        ['Courier', 'Yalidine · home delivery'],
        ['Delivery fee', '600 DA'],
        ['Total', '9 600 DA'],
      ].map(([term, value], i) => (
        <div key={term}>
          <dt>
            {term}
            {markers && i === 0 && <Marker n={8} />}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The order screen used by the Layout guideline: a full Feeef workspace that adapts to the width of
 * its pretend screen. `markers` adds the numbered callouts for the anatomy legend.
 */
export function OrderWorkspace({
  screenWidth,
  markers = false,
  alwaysTitle = false,
  inspector,
}: {
  screenWidth: number
  markers?: boolean
  alwaysTitle?: boolean
  /** Forces the inspector inline (true) or into its dialog (false); defaults to the width rule. */
  inspector?: boolean
}) {
  const [sideMode, setSideMode] = useSideMode(screenWidth)
  const [view, setView] = useState<View>('order')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const titleAway = useTitleAway(viewport, title)
  const inspectorInline = inspector ?? screenWidth >= 1024

  const views = (
    <SegmentedControl<View>
      label="Order views"
      value={view}
      onChange={setView}
      options={[
        { value: 'order', label: 'Order' },
        { value: 'calls', label: 'Calls' },
      ]}
    />
  )

  const side = (state: ScaffoldState) => {
    const rail = state.sideMode === 'rail' && !state.drawerOpen
    return (
      <ScaffoldSide
        leading={
          <div className="gl-side-brand" data-rail={rail || undefined}>
            {!rail && <Brand />}
            {markers && <Marker n={2} />}
            {!state.drawerOpen && <ScaffoldToggleButton />}
          </div>
        }
      >
        <nav aria-label="Store pages" className="gl-side-nav">
          {NAV.map((item, i) => (
            <NavigationItem
              key={item.label}
              compact={rail}
              label={item.label}
              icon={item.icon}
              active={i === 0}
              onSelect={() => state.setDrawerOpen(false)}
            />
          ))}
        </nav>
      </ScaffoldSide>
    )
  }

  const appBar = (state: ScaffoldState) => {
    const minimal = state.compact || state.sideMode !== 'expanded'
    // A rail keeps its own toggle; hidden and compact sidebars need one in the bar.
    const toggle = state.compact ? 'drawer' : state.sideMode === 'hidden' ? 'restore' : null
    return (
      <ScaffoldAppBar
        leading={
          minimal ? (
            <ToolbarGroup label="Navigation">
              {toggle && <ScaffoldToggleButton action={toggle} />}
              <Brand short />
              {markers && <Marker n={3} />}
            </ToolbarGroup>
          ) : undefined
        }
        trailing={
          <>
            {!state.compact && (
              <ToolbarGroup label="Page views">
                {views}
                {markers && <Marker n={5} />}
              </ToolbarGroup>
            )}
            <ToolbarGroup label="Order tools">
              {state.compact && (
                <IconButton variant="text" appearance="toolbar" aria-label="Call customer">
                  <Phone />
                </IconButton>
              )}
              <IconButton variant="text" appearance="toolbar" aria-label="Print label">
                <Printer />
              </IconButton>
              {!inspectorInline && (
                <IconButton
                  variant="text"
                  appearance="toolbar"
                  aria-label="Order details"
                  aria-haspopup="dialog"
                  onClick={() => setDetailsOpen(true)}
                >
                  <PanelRight />
                </IconButton>
              )}
              {markers && <Marker n={6} />}
            </ToolbarGroup>
          </>
        }
      >
        {!state.compact && (
          <Presence
            open={alwaysTitle || titleAway}
            render={(presence) => (
              <ToolbarGroup label="Page title" className="gl-bar-title" data-state={presence}>
                <span>Order #1048</span>
                {markers && <Marker n={4} />}
              </ToolbarGroup>
            )}
          />
        )}
      </ScaffoldAppBar>
    )
  }

  const bottom = (state: ScaffoldState) => {
    const confirm = (
      <Button variant="filled" onClick={() => setConfirmed(!confirmed)}>
        {confirmed ? 'Confirmed' : 'Confirm order'}
      </Button>
    )
    return state.compact ? (
      <Dock label="Order views and actions">
        <div className="gl-dock-row">
          {views}
          {confirm}
        </div>
      </Dock>
    ) : (
      <Dock
        label="Order actions"
        content={
          <span className="gl-dock-status">
            {markers && <Marker n={9} />}
            {confirmed ? 'Ready to ship' : 'Call 3 of 5'}
          </span>
        }
      >
        <div className="gl-dock-row">
          <Button variant="tonal">
            <Phone />
            Call customer
          </Button>
          {confirm}
        </div>
      </Dock>
    )
  }

  return (
    <>
      <Scaffold
        contentLabel="Order #1048"
        contentViewportRef={viewport}
        sideMode={sideMode}
        onSideModeChange={setSideMode}
        drawerLabel="Store navigation"
        side={side}
        appBar={appBar}
        bottom={bottom}
      >
        <div className="gl-page" data-inspector={inspectorInline || undefined}>
          <div className="gl-main">
            <header className="gl-page-header">
              <h3 ref={title}>
                Order #1048 {markers && <Marker n={7} />}
              </h3>
              <p>Amina Benali · Alger · placed yesterday at 18:03</p>
            </header>
            {view === 'order' ? (
              <>
                <section className="gl-card" aria-label="Products">
                  <h4>Products</h4>
                  {LINES.map((line) => (
                    <div key={line.name} className="gl-line">
                      <span>
                        {line.name}
                        <small>× {line.qty}</small>
                      </span>
                      <strong>{line.price}</strong>
                    </div>
                  ))}
                </section>
                <section className="gl-card" aria-label="Delivery">
                  <h4>Delivery</h4>
                  <p>Cité 2068 Logements, Bt 12, Bab Ezzouar, 16 · Alger</p>
                  <p className="gl-muted">Home delivery with Yalidine. Customer prefers calls after 10:30.</p>
                </section>
                <section className="gl-card" aria-label="Note">
                  <h4>Note from the customer</h4>
                  <p>“Please call before coming, the building has no name on the door.”</p>
                </section>
              </>
            ) : (
              <section className="gl-card" aria-label="Calls">
                <h4>Confirmation calls</h4>
                {CALLS.map((call) => (
                  <div key={call.when} className="gl-line">
                    <span>
                      {call.result}
                      <small>
                        {call.when} · {call.who}
                      </small>
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
          {inspectorInline && (
            <aside className="gl-inspector" aria-label="Order details">
              <h4>Details</h4>
              <Inspector markers={markers} />
            </aside>
          )}
        </div>
      </Scaffold>
      <Modal open={detailsOpen && !inspectorInline} close={() => setDetailsOpen(false)} label="Order details" scrollable>
        <Inspector markers={false} />
      </Modal>
    </>
  )
}
