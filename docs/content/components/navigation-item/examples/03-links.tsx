import { useState, type MouseEvent } from 'react'
import { Package, ShoppingBag, Truck } from 'lucide-react'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import '../nav-demo.css'

const PAGES = [
  { label: 'Orders', href: '/orders', icon: <ShoppingBag /> },
  { label: 'Products', href: '/products', icon: <Package /> },
  { label: 'Deliveries', href: '/deliveries', icon: <Truck /> },
]

export default function Links() {
  const [path, setPath] = useState('/orders')
  // A client-side router intercepts plain left clicks; modified clicks still open new tabs.
  const route = (event: MouseEvent) => {
    const link = (event.target as HTMLElement).closest('a')
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setPath(link.getAttribute('href')!)
  }
  return (
    <div className="nav-demo-layout">
      <nav aria-label="Store" className="nav-demo-side" onClick={route}>
        {PAGES.map((item) => (
          <LabNavigationItem
            key={item.href}
            compact={false}
            label={item.label}
            icon={item.icon}
            href={item.href}
            active={path === item.href}
          />
        ))}
      </nav>
      <p className="nav-demo-status" role="status">
        Current path: {path}
      </p>
    </div>
  )
}

export const meta = {
  title: 'Links',
  description:
    'With href the item renders a real link (aria-current="page" when active), so middle-click and “open in new tab” work. Route client-side by intercepting plain clicks.',
}
