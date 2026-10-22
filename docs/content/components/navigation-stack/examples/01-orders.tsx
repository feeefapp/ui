import { MapPin, MoreHorizontal, Package, Phone, Truck, User } from 'lucide-react'
import {
  LabNavigationPage,
  LabNavigationStack,
  useLabNavigationPath,
} from '@feeef.dev/ui/containers'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'
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
  const nav = useLabNavigationPath<Route>()
  return (
    <Device label="A phone showing the orders stack">
      <LabNavigationStack label="Orders" onBack={() => nav.pop()}>
        <LabNavigationPage key="orders" title="Orders" subtitle="8 waiting for confirmation">
          <LabListSection header="Today">
            {ORDERS.map((order) => (
              <LabListRow
                key={order.id}
                chevron
                leading={<Package />}
                title={`#${order.id} · ${order.customer}`}
                subtitle={`${order.city} · ${order.items} items`}
                trailing={order.total}
                onClick={() => nav.push({ page: 'order', id: order.id })}
              />
            ))}
          </LabListSection>
        </LabNavigationPage>

        {nav.path.map((route) => {
          const order = ORDERS.find((o) => o.id === route.id)!
          return route.page === 'order' ? (
            <LabNavigationPage
              key={`order-${order.id}`}
              title={`Order #${order.id}`}
              trailing={
                <LabToolbarGroup label="Order actions">
                  <LabIconButton variant="text" appearance="toolbar" aria-label="More order actions">
                    <MoreHorizontal />
                  </LabIconButton>
                </LabToolbarGroup>
              }
              bottom={
                <LabDock label="Order actions">
                  <LabButton variant="tonal">
                    <Phone size={18} /> Call
                  </LabButton>
                  <LabButton variant="filled">Confirm order</LabButton>
                </LabDock>
              }
            >
              <LabListSection header="Customer">
                <LabListRow
                  chevron
                  leading={<User />}
                  title={order.customer}
                  subtitle="0555 12 34 56"
                  onClick={() => nav.push({ page: 'customer', id: order.id })}
                />
                <LabListRow static leading={<MapPin />} title={order.city} subtitle="Home delivery" />
              </LabListSection>
              <LabListSection header="Order" footer="Swipe right anywhere on this page to go back.">
                <LabListRow static title="Items" trailing={order.items} />
                <LabListRow static leading={<Truck />} title="Courier" trailing="Yalidine" />
                <LabListRow static title="Total" trailing={order.total} />
              </LabListSection>
            </LabNavigationPage>
          ) : (
            <LabNavigationPage key={`customer-${order.id}`} title={order.customer}>
              <LabListSection header="Contact">
                <LabListRow static leading={<Phone />} title="0555 12 34 56" subtitle="Mobile" />
                <LabListRow static leading={<MapPin />} title={order.city} subtitle="Delivery address" />
              </LabListSection>
              <LabListSection header="History">
                <LabListRow static title="Orders" trailing="6" />
                <LabListRow static title="Delivered" trailing="5" />
                <LabListRow static title="Returned" trailing="1" />
              </LabListSection>
            </LabNavigationPage>
          )
        })}
      </LabNavigationStack>
    </Device>
  )
}

export const meta = {
  title: 'Orders on a phone',
  description:
    'A list pushes an order, the order pushes its customer. Each page has its own bar with the back button showing the previous title; swipe right anywhere on a page (finger or pen) or drag from the left edge with a mouse to go back.',
}
