import { useState } from 'react'
import { Package, ShoppingBag, Truck, Users } from 'lucide-react'
import {
  LabScaffold,
  LabScaffoldAppBar,
  LabScaffoldSide,
  LabScaffoldToggleButton,
} from '@feeef.dev/ui/workspace/scaffold'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
  { label: 'Customers', icon: <Users /> },
]

export default function CompactDrawer() {
  const [page, setPage] = useState('Deliveries')
  return (
    <div className="scaffold-demo-frame" data-size="phone">
      <LabScaffold
        compact
        drawerLabel="Store navigation"
        side={(state) => (
          <LabScaffoldSide leading={<strong className="scaffold-demo-brand">Atlas Store</strong>}>
            <nav aria-label="Store pages" className="scaffold-demo-nav">
              {PAGES.map((item) => (
                <LabNavigationItem
                  key={item.label}
                  compact={false}
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
        )}
        appBar={
          <LabScaffoldAppBar
            leading={
              <LabToolbarGroup label="Navigation">
                <LabScaffoldToggleButton />
              </LabToolbarGroup>
            }
          >
            <LabToolbarGroup label="Current page">
              <span className="scaffold-demo-title">{page}</span>
            </LabToolbarGroup>
          </LabScaffoldAppBar>
        }
      >
        <div className="scaffold-demo-list">
          {['Yalidine · 12 parcels', 'ZR Express · 8 parcels', 'Maystro · 3 parcels'].map((row) => (
            <div key={row} className="scaffold-demo-row">
              <span>
                <strong>{row}</strong>
                <small>Picked up today</small>
              </span>
            </div>
          ))}
        </div>
      </LabScaffold>
    </div>
  )
}

export const meta = {
  title: 'Compact drawer',
  description:
    'Below 720px the sidebar becomes a modal drawer from the start edge. compact forces that layout here; the toggle opens the drawer.',
}
