import { useState } from 'react'
import { Package, Plus, Search, ShoppingBag, Truck, Users } from 'lucide-react'
import {
  LabScaffold,
  LabScaffoldAppBar,
  LabScaffoldSide,
  LabScaffoldToggleButton,
  type LabScaffoldState,
} from '@feeef.dev/ui/workspace/scaffold'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
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
  const side = (state: LabScaffoldState) => {
    const rail = state.sideMode === 'rail' && !state.drawerOpen
    return (
      <LabScaffoldSide
        leading={
          <div className="scaffold-demo-brand">
            {!rail && <strong>Atlas Store</strong>}
            {!state.drawerOpen && <LabScaffoldToggleButton />}
          </div>
        }
      >
        <nav aria-label="Store pages" className="scaffold-demo-nav">
          {PAGES.map((item) => (
            <LabNavigationItem
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
      </LabScaffoldSide>
    )
  }

  return (
    <div className="scaffold-demo-frame">
      {/* The demo frame is a small page, so it switches to the drawer below 560px instead of 720px. */}
      <LabScaffold
        contentLabel={page}
        compactBreakpoint={560}
        side={side}
        appBar={(state) => (
          <LabScaffoldAppBar
            leading={
              (state.compact || state.sideMode === 'hidden') && (
                <LabToolbarGroup label="Navigation">
                  <LabScaffoldToggleButton />
                </LabToolbarGroup>
              )
            }
            trailing={
              <LabToolbarGroup label="Page actions">
                <LabIconButton
                  variant="text"
                  appearance="toolbar"
                  controlSize="compact"
                  aria-label="Search orders"
                >
                  <Search />
                </LabIconButton>
              </LabToolbarGroup>
            }
          >
            <LabToolbarGroup label="Current page">
              <span className="scaffold-demo-title">{page}</span>
            </LabToolbarGroup>
          </LabScaffoldAppBar>
        )}
        bottom={
          <LabDock label="Order actions">
            <LabButton variant="filled">
              <Plus />
              New order
            </LabButton>
          </LabDock>
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
      </LabScaffold>
    </div>
  )
}

export const meta = {
  title: 'Workspace',
  description:
    'Sidebar, floating app bar, content and a bottom dock. Use the toggle to step the sidebar from expanded to rail to hidden; on a narrow screen it opens the drawer.',
}
