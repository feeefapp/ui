import { useState } from 'react'
import { MessageSquare, Package, PhoneCall, Settings, ShoppingBag } from 'lucide-react'
import {
  LabNavigationPage,
  LabNavigationStack,
  LabTabView,
  useLabNavigationPath,
} from '@feeef.dev/ui/containers'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { Device } from '../../../../src/blocks/device'

const ORDERS = Array.from({ length: 24 }, (_, i) => ({
  id: 1048 - i,
  customer: ['Amina Benali', 'Yacine Haddad', 'Sara Meziane', 'Karim Saidi', 'Lina Cherif', 'Omar Belkacem'][i % 6],
  total: `${(3 + (i % 7)) * 650} DA`,
}))

function OrdersTab() {
  const nav = useLabNavigationPath<number>()
  return (
    <LabNavigationStack label="Orders" onBack={() => nav.pop()}>
      <LabNavigationPage key="orders" title="Orders" subtitle="Scroll down: the tab bar steps aside.">
        <LabListSection header="Today">
          {ORDERS.map((o) => (
            <LabListRow
              key={o.id}
              chevron
              leading={<Package />}
              title={`#${o.id} · ${o.customer}`}
              trailing={o.total}
              onClick={() => nav.push(o.id)}
            />
          ))}
        </LabListSection>
      </LabNavigationPage>
      {nav.path.map((id) => (
        <LabNavigationPage key={id} title={`Order #${id}`}>
          <LabListSection header="Order">
            <LabListRow static title="Status" trailing="To confirm" />
            <LabListRow static title="Courier" trailing="Yalidine" />
          </LabListSection>
        </LabNavigationPage>
      ))}
    </LabNavigationStack>
  )
}

function SimpleTab({ title, rows }: { title: string; rows: string[] }) {
  return (
    <LabNavigationStack label={title}>
      <LabNavigationPage key="root" title={title}>
        <LabListSection>
          {rows.map((r) => (
            <LabListRow key={r} chevron title={r} onClick={() => {}} />
          ))}
        </LabListSection>
      </LabNavigationPage>
    </LabNavigationStack>
  )
}

export default function StoreApp() {
  const [tab, setTab] = useState('orders')
  const [calling, setCalling] = useState(true)
  return (
    <Device label="A phone showing a store app with four tabs">
      <div className="demo-fill">
        <LabTabView
          label="Store"
          value={tab}
          onChange={setTab}
          accessory={
            calling && (
              <div className="demo-call">
                <PhoneCall size={18} />
                <span>Calling Amina · 02:14</span>
                <LabButton variant="text" appearance="toolbar" controlSize="compact" onClick={() => setCalling(false)}>
                  End
                </LabButton>
              </div>
            )
          }
          tabs={[
            { id: 'orders', label: 'Orders', icon: <ShoppingBag />, badge: 8, content: <OrdersTab /> },
            { id: 'inbox', label: 'Inbox', icon: <MessageSquare />, content: <SimpleTab title="Inbox" rows={['Amina Benali', 'Yacine Haddad', 'Sara Meziane']} /> },
            { id: 'products', label: 'Products', icon: <Package />, content: <SimpleTab title="Products" rows={['Linen kaftan', 'Silk scarf', 'Brass lamp']} /> },
            { id: 'settings', label: 'Settings', icon: <Settings />, content: <SimpleTab title="Settings" rows={['Store', 'Couriers', 'Payments', 'Team']} /> },
          ]}
        />
      </div>
    </Device>
  )
}

export const meta = {
  title: 'A store app',
  description:
    'Each tab keeps its own stack: open an order, switch tabs, come back, and it is still open. Scroll the orders down and the bar shrinks to the current tab with the call beside it; scroll up or tap it to bring it back. Tap Orders again to return to the top.',
}
