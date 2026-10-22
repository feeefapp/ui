import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Package, ShoppingBag, Truck, Users } from 'lucide-react'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabSlideSwitch } from '@feeef.dev/ui/primitives/slider'
import '../nav-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
  { label: 'Customers', icon: <Users /> },
]

export default function Rail() {
  const [page, setPage] = useState('Products')
  const [compact, setCompact] = useState(true)
  return (
    // Rail tooltips need a Radix Tooltip.Provider; apps usually mount one at the root.
    <Tooltip.Provider delayDuration={200}>
      <div className="nav-demo-layout">
        <nav aria-label="Store" className="nav-demo-side" data-compact={compact}>
          {PAGES.map((item) => (
            <LabNavigationItem
              key={item.label}
              compact={compact}
              label={item.label}
              icon={item.icon}
              active={page === item.label}
              onSelect={() => setPage(item.label)}
            />
          ))}
        </nav>
        <div className="demo-row">
          <span aria-hidden="true">Rail</span>
          <LabSlideSwitch label="Rail" checked={compact} onCheckedChange={setCompact} />
        </div>
      </div>
    </Tooltip.Provider>
  )
}

export const meta = {
  title: 'Rail',
  description:
    'compact hides the label visually (it stays the accessible name) and shows it as a tooltip on hover and focus. Use it in a 64px sidebar rail.',
}
