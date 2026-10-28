import { useState } from 'react'
import { Phone } from 'lucide-react'
import { NavigationPage, NavigationStack } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Sheet } from '@feeef.dev/ui/containers'
import { PresentationDock } from '@feeef.dev/ui/presentation'
import { Device } from '../../../../src/blocks/device'

const ORDERS = [
  { id: 1048, name: 'Amina Benali', city: 'Alger', total: '4,500 DA' },
  { id: 1047, name: 'Yacine Haddad', city: 'Oran', total: '2,900 DA' },
  { id: 1046, name: 'Sara Meziane', city: 'Blida', total: '6,200 DA' },
]

export default function PhonePane() {
  const [open, setOpen] = useState(false)
  const [order, setOrder] = useState(ORDERS[0])
  return (
    <Device label="A phone where the pane opens as a sheet">
      {(screen) => (
        <>
          <div className="demo-fill" data-lab-sheet-backdrop="">
            <NavigationStack label="Orders">
              <NavigationPage key="orders" title="Orders">
                <ListSection header="To confirm">
                  {ORDERS.map((o) => (
                    <ListRow
                      key={o.id}
                      title={`#${o.id} · ${o.name}`}
                      subtitle={o.city}
                      trailing={o.total}
                      onClick={() => {
                        setOrder(o)
                        setOpen(true)
                      }}
                    />
                  ))}
                </ListSection>
              </NavigationPage>
            </NavigationStack>
          </div>
          <Sheet
            regular="pane"
            open={open}
            onOpenChange={setOpen}
            container={screen}
            label={`Order #${order.id}`}
            title={`Order #${order.id}`}
            dock={
              <PresentationDock>
                <Button variant="text" onClick={() => setOpen(false)}>
                  <Phone size={18} /> Call
                </Button>
                <Button variant="filled" onClick={() => setOpen(false)}>
                  Confirm order
                </Button>
              </PresentationDock>
            }
          >
            <ListSection>
              <ListRow static title="Customer" trailing={order.name} />
              <ListRow static title="Wilaya" trailing={order.city} />
              <ListRow static title="Total" trailing={order.total} />
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'Pane on a phone',
  description:
    'The same pane sheet inside a 390px phone: below the breakpoint it rises from the bottom and fits its content, with the title and close in its header and the dock at the bottom. Drag it down to close.',
}
