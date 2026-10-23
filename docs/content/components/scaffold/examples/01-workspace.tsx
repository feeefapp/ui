import { useState } from 'react'
import { Package, Plus, Search, ShoppingBag, Truck, Users } from 'lucide-react'
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
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
  { label: 'Customers', icon: <Users /> },
]

const ORDERS = [
  { id: '#1048', customer: 'Amina Benali', city: 'Alger', total: '4 500 DA' },
  { id: '#1047', customer: 'Yacine Haddad', city: 'Oran', total: '2 900 DA' },
  { id: '#1046', customer: 'Sara Meziane', city: 'Constantine', total: '7 200 DA' },
  { id: '#1045', customer: 'Karim Saidi', city: 'Blida', total: '3 100 DA' },
  { id: '#1044', customer: 'Lina Cherif', city: 'Sétif', total: '5 650 DA' },
  { id: '#1043', customer: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA' },
]

export default function Workspace() {
  const [page, setPage] = useState('Orders')

  // Slots can be functions of the scaffold state: here the sidebar knows when it is a rail.
  const side = (state: ScaffoldState) => {
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
          {PAGES.map((item) => (
            <NavigationItem
              key={item.label}
              compact={rail}
              label={item.label}
              icon={item.icon}
              active={page === item.label}
              onSelect={() => {
                setPage(item.label)
                state.setDrawerOpen(false)
              }}
            />
          ))}
        </nav>
      </ScaffoldSide>
    )
  }

  return (
    <div className="scaffold-demo-frame">
      {/* The demo frame is a small page, so it switches to the drawer below 560px instead of 720px. */}
      <Scaffold
        contentLabel={page}
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
              <span className="scaffold-demo-title">{page}</span>
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
          {ORDERS.map((order) => (
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
