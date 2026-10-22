import { MapPin, MoreHorizontal, Package, Phone, Truck, User } from 'lucide-react'
import {
  NavigationPage,
  NavigationStack,
  useNavigationPath,
} from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Device } from '../../../../src/blocks/device'

const ORDERS = [
  { id: 1048, customer: 'Amina Benali', city: 'Alger', total: '4 500 DA', items: 3 },
  { id: 1047, customer: 'Yacine Haddad', city: 'Oran', total: '2 900 DA', items: 1 },
  { id: 1046, customer: 'Sara Meziane', city: 'Constantine', total: '7 200 DA', items: 4 },
  { id: 1045, customer: 'Karim Saidi', city: 'Blida', total: '3 100 DA', items: 2 },
  { id: 1044, customer: 'Lina Cherif', city: 'Sétif', total: '5 650 DA', items: 2 },
  { id: 1043, customer: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA', items: 1 },
  { id: 1042, customer: 'Nour Hamidi', city: 'Tlemcen', total: '6 300 DA', items: 5 },
  { id: 1041, customer: 'Riad Boudjema', city: 'Béjaïa', total: '2 450 DA', items: 1 },
]
type Route = { page: 'order'; id: number } | { page: 'customer'; id: number }

export default function OrdersStack() {
  const nav = useNavigationPath<Route>()
  return (
    <Device label="A phone showing the orders stack">
      <NavigationStack label="Orders" onBack={() => nav.pop()}>
        <NavigationPage key="orders" title="Orders" subtitle="8 waiting for confirmation">
          <ListSection header="Today">
            {ORDERS.map((order) => (
              <ListRow
                key={order.id}
                chevron
                leading={<Package />}
                title={`#${order.id} · ${order.customer}`}
                subtitle={`${order.city} · ${order.items} items`}
                trailing={order.total}
                onClick={() => nav.push({ page: 'order', id: order.id })}
              />
            ))}
          </ListSection>
        </NavigationPage>

        {nav.path.map((route) => {
          const order = ORDERS.find((o) => o.id === route.id)!
          return route.page === 'order' ? (
            <NavigationPage
              key={`order-${order.id}`}
              title={`Order #${order.id}`}
              trailing={
                <ToolbarGroup label="Order actions">
                  <IconButton variant="text" appearance="toolbar" aria-label="More order actions">
                    <MoreHorizontal />
                  </IconButton>
                </ToolbarGroup>
              }
              bottom={
                <Dock label="Order actions">
                  <Button variant="tonal">
                    <Phone size={18} /> Call
                  </Button>
                  <Button variant="filled">Confirm order</Button>
                </Dock>
              }
            >
              <ListSection header="Customer">
                <ListRow
                  chevron
                  leading={<User />}
                  title={order.customer}
                  subtitle="0555 12 34 56"
                  onClick={() => nav.push({ page: 'customer', id: order.id })}
                />
                <ListRow static leading={<MapPin />} title={order.city} subtitle="Home delivery" />
              </ListSection>
              <ListSection header="Order" footer="Swipe right anywhere on this page to go back.">
                <ListRow static title="Items" trailing={order.items} />
                <ListRow static leading={<Truck />} title="Courier" trailing="Yalidine" />
                <ListRow static title="Total" trailing={order.total} />
              </ListSection>
            </NavigationPage>
          ) : (
            <NavigationPage key={`customer-${order.id}`} title={order.customer}>
              <ListSection header="Contact">
                <ListRow static leading={<Phone />} title="0555 12 34 56" subtitle="Mobile" />
                <ListRow static leading={<MapPin />} title={order.city} subtitle="Delivery address" />
              </ListSection>
              <ListSection header="History">
                <ListRow static title="Orders" trailing="6" />
                <ListRow static title="Delivered" trailing="5" />
                <ListRow static title="Returned" trailing="1" />
              </ListSection>
            </NavigationPage>
          )
        })}
      </NavigationStack>
    </Device>
  )
}

export const meta = {
  title: 'Orders on a phone',
  description:
    'A list pushes an order, the order pushes its customer. Each page has its own bar with the back button showing the previous title; swipe right anywhere on a page (finger or pen) or drag from the left edge with a mouse to go back.',
}
