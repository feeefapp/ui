import { useState } from 'react'
import { ChevronRight, Inbox, Package, ShoppingBag, Truck } from 'lucide-react'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import '../nav-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag />, trailing: '12' },
  { label: 'Deliveries', icon: <Truck />, trailing: '3' },
  { label: 'Products', icon: <Package /> },
  { label: 'Inbox', icon: <Inbox />, trailing: <ChevronRight className="lab-dir-flip" aria-hidden="true" /> },
]

export default function Counts() {
  const [page, setPage] = useState('Orders')
  return (
    <nav aria-label="Store" className="nav-demo-side">
      {PAGES.map((item) => (
        <NavigationItem
          key={item.label}
          compact={false}
          label={item.label}
          icon={item.icon}
          trailing={item.trailing}
          active={page === item.label}
          onSelect={() => setPage(item.label)}
        />
      ))}
    </nav>
  )
}

export const meta = {
  title: 'Counts and chevrons',
  description:
    'trailing puts a count, badge or chevron in a square at the end, the same size as the icon square at the start.',
}
