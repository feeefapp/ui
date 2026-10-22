import { useState } from 'react'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'

const ORDERS = [
  { id: '10231', customer: 'Yacine Haddad', total: '4 500 DZD' },
  { id: '10232', customer: 'Sara Meziane', total: '2 800 DZD' },
  { id: '10233', customer: 'Karim Bensalah', total: '7 200 DZD' },
]

export default function SelectAll() {
  const [selected, setSelected] = useState<string[]>(['10232'])
  const all = selected.length === ORDERS.length
  const some = selected.length > 0 && !all
  return (
    <div className="demo-column">
      <Checkbox
        label={`Select all (${selected.length} of ${ORDERS.length})`}
        checked={all}
        indeterminate={some}
        onCheckedChange={() => setSelected(all || some ? [] : ORDERS.map((order) => order.id))}
      />
      <div style={{ display: 'grid', gap: 8, paddingInlineStart: 28 }}>
        {ORDERS.map((order) => (
          <Checkbox
            key={order.id}
            label={`#${order.id} · ${order.customer}`}
            description={order.total}
            checked={selected.includes(order.id)}
            onCheckedChange={(checked) =>
              setSelected((list) => (checked ? [...list, order.id] : list.filter((id) => id !== order.id)))
            }
          />
        ))}
      </div>
    </div>
  )
}

export const meta = {
  title: 'Select all',
  description: 'The parent is indeterminate while only some orders are selected. Derive it from the list on every render.',
}
