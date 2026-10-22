import { useState } from 'react'
import { LabFilterBar, type LabFilterOption } from '@feeef.dev/ui/filter-bar'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import '../filter-demo.css'

const OPTIONS: LabFilterOption[] = [
  { id: 'unpaid', label: 'Unpaid', description: 'Cash not collected yet' },
  { id: 'returned', label: 'Returned', keywords: ['refused', 'retour'] },
  { id: 'express', label: 'Express delivery' },
]

const ORDERS = [
  { id: '#1048', name: 'Amina Benali', unpaid: true, returned: false, express: true },
  { id: '#1047', name: 'Yacine Haddad', unpaid: false, returned: false, express: false },
  { id: '#1046', name: 'Sara Meziane', unpaid: true, returned: true, express: false },
  { id: '#1045', name: 'Karim Saidi', unpaid: false, returned: false, express: true },
  { id: '#1044', name: 'Lina Cherif', unpaid: true, returned: false, express: false },
]

export default function OnOff() {
  const [enabled, setEnabled] = useState<string[]>(['unpaid'])
  const [pinned, setPinned] = useState<string[]>(['unpaid', 'express'])
  const rows = ORDERS.filter((order) => enabled.every((id) => order[id as 'unpaid' | 'returned' | 'express']))
  return (
    <div className="filter-demo-frame">
      <LabScrollArea
        label="Orders"
        top={
          <LabFilterBar
            label="Order filters"
            options={OPTIONS}
            value={enabled}
            onChange={setEnabled}
            pinned={pinned}
            onPinnedChange={setPinned}
          />
        }
      >
        <div className="filter-demo-list">
          {rows.map((order) => (
            <div key={order.id} className="filter-demo-row">
              <span>
                <strong>
                  {order.id} · {order.name}
                </strong>
                <small>
                  {[order.unpaid && 'Unpaid', order.returned && 'Returned', order.express && 'Express']
                    .filter(Boolean)
                    .join(' · ') || 'Paid'}
                </small>
              </span>
            </div>
          ))}
          {!rows.length && <p className="filter-demo-empty">No orders match these filters.</p>}
        </div>
      </LabScrollArea>
    </div>
  )
}

export const meta = {
  title: 'On/off filters',
  description:
    'Options without a type are on/off. value lists the enabled ids; pinned lists the chips shown in the bar. Open the catalog to toggle, pin and unpin.',
}
