import { useState } from 'react'
import { Inbox, MapPin, Package, Phone, User } from 'lucide-react'
import { LabNavigationPage, LabSplitPlaceholder, LabSplitView } from '@feeef.dev/ui/containers'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { LabDock } from '@feeef.dev/ui/dock'
import { Device } from '../../../../src/blocks/device'

const ORDERS = [
  { id: 1048, customer: 'Amina Benali', city: 'Alger', total: '4 500 DA' },
  { id: 1047, customer: 'Yacine Haddad', city: 'Oran', total: '2 900 DA' },
  { id: 1046, customer: 'Sara Meziane', city: 'Constantine', total: '7 200 DA' },
  { id: 1045, customer: 'Karim Saidi', city: 'Blida', total: '3 100 DA' },
  { id: 1044, customer: 'Lina Cherif', city: 'Sétif', total: '5 650 DA' },
  { id: 1043, customer: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA' },
]

export default function OrdersSplit() {
  const [screen, setScreen] = useState<'tablet' | 'phone'>('tablet')
  const [selected, setSelected] = useState<number | null>(1047)
  const [showCustomer, setShowCustomer] = useState(false)
  const order = ORDERS.find((o) => o.id === selected)

  const back = () => (showCustomer ? setShowCustomer(false) : setSelected(null))
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', justifyItems: 'center' }}>
      <LabSegmentedControl
        label="Screen"
        value={screen}
        onChange={setScreen}
        options={[
          { value: 'tablet', label: 'Tablet' },
          { value: 'phone', label: 'Phone' },
        ]}
      />
      <Device kind={screen} label={`Orders split view on a ${screen}`}>
        <div className="demo-fill">
          <LabSplitView
            label="Orders"
            onBack={back}
            placeholder={<LabSplitPlaceholder icon={<Inbox />} title="Select an order" />}
            list={
              <LabNavigationPage key="orders" title="Orders" subtitle="6 to confirm">
                <LabListSection label="Orders">
                  {ORDERS.map((o) => (
                    <LabListRow
                      key={o.id}
                      leading={<Package />}
                      title={`#${o.id} · ${o.customer}`}
                      subtitle={o.city}
                      trailing={o.total}
                      selected={o.id === selected}
                      chevron={screen === 'phone'}
                      onClick={() => {
                        setSelected(o.id)
                        setShowCustomer(false)
                      }}
                    />
                  ))}
                </LabListSection>
              </LabNavigationPage>
            }
            detail={
              order && (
                <>
                  <LabNavigationPage
                    key={`order-${order.id}`}
                    title={`Order #${order.id}`}
                    titleDisplay="inline"
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
                        onClick={() => setShowCustomer(true)}
                      />
                      <LabListRow static leading={<MapPin />} title={order.city} subtitle="Home delivery" />
                    </LabListSection>
                    <LabListSection header="Order">
                      <LabListRow static title="Total" trailing={order.total} />
                      <LabListRow static title="Courier" trailing="Yalidine" />
                    </LabListSection>
                  </LabNavigationPage>
                  {showCustomer && (
                    <LabNavigationPage key={`customer-${order.id}`} title={order.customer}>
                      <LabListSection header="Contact">
                        <LabListRow static leading={<Phone />} title="0555 12 34 56" />
                        <LabListRow static leading={<MapPin />} title={order.city} />
                      </LabListSection>
                    </LabNavigationPage>
                  )}
                </>
              )
            }
          />
        </div>
      </Device>
    </div>
  )
}

export const meta = {
  title: 'Orders inbox',
  description:
    'One component, two layouts. On the tablet: list and order side by side; drag the divider (or focus it and use the arrow keys) to resize the list. On the phone: a stack; the order pushes over the list and swipes back. The customer page pushes in both.',
}
