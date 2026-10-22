import { useState, type ReactNode } from 'react'
import { BarChart3, Package, Settings, ShoppingBag, Truck, Users } from 'lucide-react'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import '../nav-demo.css'

const MAIN = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
  { label: 'Customers', icon: <Users /> },
]
const MORE = [
  { label: 'Analytics', icon: <BarChart3 /> },
  { label: 'Settings', icon: <Settings /> },
]

export default function Sidebar() {
  const [page, setPage] = useState('Orders')
  const item = ({ label, icon }: { label: string; icon: ReactNode }) => (
    <NavigationItem
      key={label}
      compact={false}
      label={label}
      icon={icon}
      active={page === label}
      onSelect={() => setPage(label)}
    />
  )
  return (
    <nav aria-label="Store" className="nav-demo-side">
      {MAIN.map(item)}
      <span className="nav-demo-side-heading">STORE</span>
      {MORE.map(item)}
    </nav>
  )
}

export const meta = {
  title: 'Sidebar navigation',
  description:
    'Each item is an icon and a label. active marks the current page; put the items in a nav with an aria-label.',
}
