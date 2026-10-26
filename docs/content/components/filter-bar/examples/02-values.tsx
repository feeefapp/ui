import { useState } from 'react'
import { FilterBar, type FilterOption, type FilterValue } from '@feeef.dev/ui/filter-bar'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import '../filter-demo.css'

const OPTIONS: FilterOption[] = [
  {
    id: 'wilaya',
    label: 'Wilaya',
    type: 'enum',
    choices: [
      { value: 'alger', label: 'Alger' },
      { value: 'oran', label: 'Oran' },
      { value: 'constantine', label: 'Constantine' },
      { value: 'blida', label: 'Blida' },
    ],
  },
  {
    id: 'courier',
    label: 'Courier',
    type: 'enum',
    choices: [
      { value: 'yalidine', label: 'Yalidine' },
      { value: 'zr', label: 'ZR Express' },
      { value: 'maystro', label: 'Maystro' },
    ],
  },
  { id: 'created', label: 'Created', type: 'dateRange', description: 'Order date, inclusive' },
  {
    id: 'window',
    label: 'Delivery window',
    type: 'timeRange',
    presets: [
      { label: 'Morning', value: { from: '08:00', to: '12:00' } },
      { label: 'Afternoon', value: { from: '13:00', to: '18:00' } },
    ],
  },
]

const ORDERS = [
  { id: '#1048', wilaya: 'alger', courier: 'yalidine', created: '2026-10-18' },
  { id: '#1047', wilaya: 'oran', courier: 'zr', created: '2026-10-17' },
  { id: '#1046', wilaya: 'constantine', courier: 'yalidine', created: '2026-10-12' },
  { id: '#1045', wilaya: 'alger', courier: 'maystro', created: '2026-10-09' },
  { id: '#1044', wilaya: 'blida', courier: 'zr', created: '2026-10-02' },
]

export default function Values() {
  const [values, setValues] = useState<Record<string, FilterValue>>({ wilaya: 'alger' })
  const [pinned, setPinned] = useState<string[]>(['wilaya', 'created'])
  const created = values.created && typeof values.created === 'object' ? values.created : null
  const rows = ORDERS.filter(
    (order) =>
      (!values.wilaya || order.wilaya === values.wilaya) &&
      (!values.courier || order.courier === values.courier) &&
      (!created?.from || order.created >= created.from) &&
      (!created?.to || order.created <= created.to)
  )
  return (
    <div className="filter-demo-frame">
      <ScrollArea
        label="Orders"
        top={
          <FilterBar
            label="Order filters"
            options={OPTIONS}
            value={[]}
            onChange={() => {}}
            values={values}
            onValuesChange={setValues}
            pinned={pinned}
            onPinnedChange={setPinned}
          />
        }
      >
        <div className="filter-demo-list">
          {rows.map((order) => (
            <div key={order.id} className="filter-demo-row">
              <span>
                <strong>Order {order.id}</strong>
                <small>
                  {order.wilaya} · {order.courier} · {order.created}
                </small>
              </span>
            </div>
          ))}
          {!rows.length && <p className="filter-demo-empty">No orders match these filters.</p>}
        </div>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Choices and dates',
  description:
    'enum options open a searchable list; single dates and times open a small popover; ranges open a dialog with presets. Values arrive in values / onValuesChange.',
}
