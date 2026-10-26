import { useState, type ReactNode } from 'react'
import { MessageSquare, Package, Settings, ShoppingBag } from 'lucide-react'
import { NavigationPage, NavigationStack, TabView } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { Device } from '../../../../src/blocks/device'

const TO_CONFIRM = ['Amina Benali', 'Yacine Haddad', 'Sara Meziane', 'Karim Saidi', 'Lina Cherif']

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <NavigationStack label={title}>
      <NavigationPage key="root" title={title} subtitle={subtitle}>
        {children}
      </NavigationPage>
    </NavigationStack>
  )
}

export default function Badges() {
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState(TO_CONFIRM)
  return (
    <Device label="A phone whose tab bar counts what needs action" height={480}>
      <div className="demo-fill">
        <TabView
          label="Store"
          value={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'orders',
              label: 'Orders',
              icon: <ShoppingBag />,
              badge: orders.length ? String(orders.length) : undefined,
              content: (
                <Page title="To confirm" subtitle="Confirm an order: the badge counts down.">
                  <ListSection>
                    {orders.map((name) => (
                      <ListRow
                        key={name}
                        leading={<Package />}
                        title={name}
                        trailing="Confirm"
                        onClick={() => setOrders((list) => list.filter((n) => n !== name))}
                      />
                    ))}
                    {!orders.length && <ListRow static title="Every order is confirmed" />}
                  </ListSection>
                </Page>
              ),
            },
            {
              id: 'inbox',
              label: 'Inbox',
              icon: <MessageSquare />,
              badge: '3',
              content: (
                <Page title="Inbox">
                  <ListSection>
                    {['Amina Benali', 'Omar Belkacem', 'Sara Meziane'].map((name) => (
                      <ListRow key={name} chevron title={name} onClick={() => {}} />
                    ))}
                  </ListSection>
                </Page>
              ),
            },
            {
              id: 'products',
              label: 'Products',
              icon: <Package />,
              content: (
                <Page title="Products">
                  <ListSection>
                    {['Linen kaftan', 'Silk scarf', 'Brass lamp'].map((name) => (
                      <ListRow key={name} chevron title={name} onClick={() => {}} />
                    ))}
                  </ListSection>
                </Page>
              ),
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings />,
              content: (
                <Page title="Settings">
                  <ListSection>
                    {['Store', 'Couriers', 'Payments'].map((name) => (
                      <ListRow key={name} chevron title={name} onClick={() => {}} />
                    ))}
                  </ListSection>
                </Page>
              ),
            },
          ]}
        />
      </div>
    </Device>
  )
}

export const meta = {
  title: 'Badges and dragging',
  description:
    'A count that needs action sits on the tab’s icon and is read with its name (“Orders, 5”). Confirm an order and it counts down; with none left the badge goes. Press the selected tab and drag it across the bar: it lifts into a glass lens, and the tab under it when you let go opens.',
}
