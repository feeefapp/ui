import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  Inbox,
  ListChecks,
  Package,
  PackageCheck,
  PhoneCall,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Scaffold,
  ScaffoldAppBar,
  ScaffoldSide,
  ScaffoldToggleButton,
  type ScaffoldState,
} from '@feeef.dev/ui/workspace/scaffold'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { GlassContainer } from '@feeef.dev/ui/glass'
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
  { label: 'Customers', icon: <Users /> },
]

/** Order rooms: the expandable Orders group. `null` is every order. */
const ROOMS: { id: string | null; label: string; icon: ReactNode; accent: string }[] = [
  { id: null, label: 'All orders', icon: <ListChecks />, accent: 'var(--lab-muted)' },
  { id: 'open', label: 'Open', icon: <Inbox />, accent: 'var(--lab-warning)' },
  { id: 'confirmed', label: 'Confirmed', icon: <PhoneCall />, accent: 'var(--lab-primary)' },
  { id: 'shipped', label: 'Shipped', icon: <Send />, accent: 'var(--lab-accent)' },
  { id: 'delivered', label: 'Delivered', icon: <PackageCheck />, accent: 'var(--lab-success)' },
]

const ORDERS = [
  { id: '#1048', customer: 'Amina Benali', city: 'Alger', total: '4 500 DA', room: 'open' },
  { id: '#1047', customer: 'Yacine Haddad', city: 'Oran', total: '2 900 DA', room: 'open' },
  { id: '#1046', customer: 'Sara Meziane', city: 'Constantine', total: '7 200 DA', room: 'confirmed' },
  { id: '#1045', customer: 'Karim Saidi', city: 'Blida', total: '3 100 DA', room: 'shipped' },
  { id: '#1044', customer: 'Lina Cherif', city: 'Sétif', total: '5 650 DA', room: 'shipped' },
  { id: '#1043', customer: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA', room: 'delivered' },
]

/** A sidebar row with its leading marker (a dot that grows into a thin bar on the current page). */
function NavRow({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <div className="scaffold-demo-nav-row" data-current={active ? 'true' : 'false'}>
      {children}
    </div>
  )
}

/** The sidebar's scrollbar shows while scrolling or hovering and fades ~1 s after the last scroll. */
function useAutoHideScrollbar() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const viewport = ref.current?.closest<HTMLElement>('.lab-scroll-viewport')
    if (!viewport) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      viewport.dataset.scrolling = ''
      clearTimeout(timer)
      timer = setTimeout(() => delete viewport.dataset.scrolling, 1000)
    }
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      viewport.removeEventListener('scroll', onScroll)
    }
  }, [])
  return ref
}

export default function Workspace() {
  const [page, setPage] = useState('Orders')
  const [room, setRoom] = useState<string | null>(null)
  const [ordersOpen, setOrdersOpen] = useState(true)
  const navRef = useAutoHideScrollbar()
  const title = page === 'Orders' ? ROOMS.find((r) => r.id === room)!.label : page
  const orders = ORDERS.filter((o) => room == null || o.room === room)

  // Slots can be functions of the scaffold state: here the sidebar knows when it is a rail.
  const side = (state: ScaffoldState) => {
    const rail = state.sideMode === 'rail' && !state.drawerOpen
    const ordersActive = page === 'Orders'
    const select = (next: string, nextRoom: string | null = null) => {
      setPage(next)
      setRoom(nextRoom)
      state.setDrawerOpen(false)
    }
    return (
      <ScaffoldSide
        className="scaffold-demo-side"
        leading={
          <div className="scaffold-demo-brand">
            {!rail && <strong>Atlas Store</strong>}
            {!state.drawerOpen && <ScaffoldToggleButton />}
          </div>
        }
        trailing={
          // Avatar and wallet: two 44px bubbles of one glass container. The rail keeps the avatar.
          <GlassContainer light="static" adaptive={false} className="scaffold-demo-account" data-compact={rail}>
            <GlassGroup className="scaffold-demo-chip scaffold-demo-chip--avatar">
              <IconButton variant="text" appearance="toolbar" aria-label="Account">
                <User />
              </IconButton>
            </GlassGroup>
            {!rail && (
              <GlassGroup className="scaffold-demo-chip">
                <Button variant="text" appearance="toolbar" aria-label="Wallet: 12 400 DA" className="scaffold-demo-wallet">
                  <Wallet />
                  <span>
                    <small>Wallet</small>
                    <strong>12 400 DA</strong>
                  </span>
                </Button>
              </GlassGroup>
            )}
          </GlassContainer>
        }
      >
        <nav ref={navRef} aria-label="Store pages" className="scaffold-demo-nav">
          {rail ? (
            <NavRow active={ordersActive}>
              <NavigationItem compact label="Orders" icon={<ShoppingBag />} active={ordersActive} onSelect={() => select('Orders')} />
            </NavRow>
          ) : (
            // Expanded on the current page, the group sits on muted liquid glass.
            <div className="scaffold-demo-group" data-active={ordersActive}>
              <GlassContainer light="static" interactive={false} adaptive={false} className="scaffold-demo-group-glass" aria-hidden="true">
                <GlassGroup glassMotion="follow" className="scaffold-demo-group-bubble" />
              </GlassContainer>
              <NavigationItem
                compact={false}
                label="Orders"
                icon={<ShoppingBag />}
                onSelect={() => setOrdersOpen((open) => !open)}
                trailing={<ChevronDown className="scaffold-demo-chevron" data-open={ordersOpen} />}
              />
              {ordersOpen && (
                <div className="scaffold-demo-group-rows">
                  {ROOMS.map((r) => {
                    const current = ordersActive && room === r.id
                    const count = ORDERS.filter((o) => r.id == null || o.room === r.id).length
                    return (
                      <NavRow key={r.label} active={current}>
                        <NavigationItem
                          compact={false}
                          label={r.label}
                          icon={<span className="scaffold-demo-room-icon" style={{ color: r.accent }}>{r.icon}</span>}
                          active={current}
                          onSelect={() => select('Orders', r.id)}
                          trailing={
                            <span className="scaffold-demo-count" style={{ background: r.accent }}>
                              {count}
                            </span>
                          }
                        />
                      </NavRow>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {PAGES.map((item) => (
            <NavRow key={item.label} active={page === item.label}>
              <NavigationItem
                compact={rail}
                label={item.label}
                icon={item.icon}
                active={page === item.label}
                onSelect={() => select(item.label)}
              />
            </NavRow>
          ))}
        </nav>
      </ScaffoldSide>
    )
  }

  return (
    <div className="scaffold-demo-frame">
      {/* The demo frame is a small page, so it switches to the drawer below 560px instead of 720px. */}
      <Scaffold
        contentLabel={title}
        compactBreakpoint={560}
        side={side}
        appBar={(state) => (
          <ScaffoldAppBar
            leading={
              (state.compact || state.sideMode === 'hidden') && (
                <ToolbarGroup label="Navigation">
                  <ScaffoldToggleButton />
                </ToolbarGroup>
              )
            }
            trailing={
              <ToolbarGroup label="Page actions">
                <IconButton
                  variant="text"
                  appearance="toolbar"
                  aria-label="Search orders"
                >
                  <Search />
                </IconButton>
              </ToolbarGroup>
            }
          >
            <ToolbarGroup label="Current page">
              <span className="scaffold-demo-title">{title}</span>
            </ToolbarGroup>
          </ScaffoldAppBar>
        )}
        bottom={
          <Dock label="Order actions">
            <Button variant="filled">
              <Plus />
              New order
            </Button>
          </Dock>
        }
      >
        <div className="scaffold-demo-list">
          {orders.map((order) => (
            <div key={order.id} className="scaffold-demo-row">
              <span>
                <strong>
                  {order.id} · {order.customer}
                </strong>
                <small>{order.city} · Cash on delivery</small>
              </span>
              <strong>{order.total}</strong>
            </div>
          ))}
        </div>
      </Scaffold>
    </div>
  )
}

export const meta = {
  title: 'Workspace',
  description:
    'Sidebar, floating app bar, content and a bottom dock. Use the toggle to step the sidebar from expanded to rail to hidden; on a narrow screen it opens the drawer.',
}
