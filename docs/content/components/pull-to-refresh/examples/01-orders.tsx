import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ScrollArea, useRefreshController } from '@feeef.dev/ui/scroll'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import '../pull-demo.css'

const CITIES = ['Alger', 'Oran', 'Constantine', 'Blida', 'Sétif']
const order = (id: number) => ({ id, city: CITIES[id % CITIES.length], total: `${((id % 7) + 2) * 1450} DA` })

export default function Orders() {
  const [orders, setOrders] = useState(() => Array.from({ length: 10 }, (_, i) => order(1060 - i)))
  const refresh = useRefreshController()
  // Your fetch goes here; the loader stays until the promise settles.
  const load = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setOrders((list) => [order(list[0].id + 1), ...list])
  }
  return (
    <div className="pull-demo-frame">
      <ScrollArea
        label="New orders"
        onRefresh={load}
        refreshController={refresh}
        top={
          <Toolbar
            label="Order tools"
            leading={
              <ToolbarGroup label="Title">
                <span className="pull-demo-title">New orders</span>
              </ToolbarGroup>
            }
            trailing={
              <ToolbarGroup label="Actions">
                {/* Not everyone can pull: the same refresh from a button. */}
                <IconButton aria-label="Refresh" appearance="toolbar" onClick={() => refresh.refresh()}>
                  <RefreshCw />
                </IconButton>
              </ToolbarGroup>
            }
          />
        }
      >
        <ListSection>
          {orders.map((item) => (
            <ListRow
              key={item.id}
              chevron
              title={`Order #${item.id}`}
              subtitle={`${item.city} · cash on delivery`}
              trailing={item.total}
              onClick={() => {}}
            />
          ))}
        </ListSection>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Pull to refresh a list',
  description:
    'On a touch screen, pull the list down from the top. The Refresh button runs the same refresh through a RefreshController.',
}
