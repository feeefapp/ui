import { useState } from 'react'
import { Plus, Truck, X } from 'lucide-react'
import { LabFilterBar, type LabFilterOption, type LabFilterValue } from '@feeef.dev/ui/filter-bar'
import { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'
import '../patterns.css'

type Order = { id: string; customer: string; wilaya: string; courier: string; total: string; confirmed: boolean; called: boolean }

const ORDERS: Order[] = [
  { id: '1048', customer: 'Amina Benali', wilaya: 'Alger', courier: 'Yalidine', total: '9 600 DA', confirmed: false, called: true },
  { id: '1047', customer: 'Yacine Haddad', wilaya: 'Oran', courier: 'ZR Express', total: '2 900 DA', confirmed: false, called: false },
  { id: '1046', customer: 'Sara Meziane', wilaya: 'Constantine', courier: 'Yalidine', total: '7 200 DA', confirmed: true, called: true },
  { id: '1045', customer: 'Karim Saidi', wilaya: 'Blida', courier: 'Maystro', total: '3 100 DA', confirmed: false, called: false },
  { id: '1044', customer: 'Lina Cherif', wilaya: 'Sétif', courier: 'ZR Express', total: '5 650 DA', confirmed: false, called: true },
  { id: '1043', customer: 'Omar Belkacem', wilaya: 'Annaba', courier: 'Yalidine', total: '1 800 DA', confirmed: false, called: false },
  { id: '1042', customer: 'Nour Hamidi', wilaya: 'Alger', courier: 'Maystro', total: '4 300 DA', confirmed: true, called: true },
]

const FILTERS: LabFilterOption[] = [
  { id: 'notCalled', label: 'Not called yet', description: 'No confirmation call so far' },
  {
    id: 'wilaya',
    label: 'Wilaya',
    type: 'enum',
    choices: ['Alger', 'Oran', 'Constantine', 'Blida', 'Sétif', 'Annaba'].map((name) => ({ value: name, label: name })),
  },
  {
    id: 'courier',
    label: 'Courier',
    type: 'enum',
    choices: ['Yalidine', 'ZR Express', 'Maystro'].map((name) => ({ value: name, label: name })),
  },
]

export default function OrdersList() {
  const [orders, setOrders] = useState(ORDERS)
  const [query, setQuery] = useState('')
  const [toggles, setToggles] = useState<string[]>([])
  const [values, setValues] = useState<Record<string, LabFilterValue>>({})
  const [pinned, setPinned] = useState<string[]>(['notCalled'])
  const [selected, setSelected] = useState<string[]>([])

  const q = query.trim().toLowerCase()
  const rows = orders.filter(
    (order) =>
      (!q || `${order.id} ${order.customer}`.toLowerCase().includes(q)) &&
      (!toggles.includes('notCalled') || !order.called) &&
      (!values.wilaya || order.wilaya === values.wilaya) &&
      (!values.courier || order.courier === values.courier)
  )
  const visibleSelected = selected.filter((id) => rows.some((order) => order.id === id))
  const allSelected = rows.length > 0 && visibleSelected.length === rows.length
  const toggle = (id: string, on: boolean) =>
    setSelected((current) => (on ? [...current, id] : current.filter((value) => value !== id)))
  const clearFilters = () => {
    setQuery('')
    setToggles([])
    setValues({})
  }
  const confirmSelected = () => {
    setOrders((current) => current.map((order) => (selected.includes(order.id) ? { ...order, confirmed: true } : order)))
    setSelected([])
  }

  return (
    <div className="pt-frame">
      <LabScrollArea
        label="Orders"
        top={
          // The search springs open over the row; the filter bar sits beside it while it is closed.
          <LabToolbarSearch label="Search orders" placeholder="Order number or name" value={query} onValueChange={setQuery}>
            <LabFilterBar
              label="Order filters"
              options={FILTERS}
              value={toggles}
              onChange={setToggles}
              values={values}
              onValuesChange={setValues}
              pinned={pinned}
              onPinnedChange={setPinned}
            />
          </LabToolbarSearch>
        }
        bottom={
          visibleSelected.length ? (
            <LabDock
              label="Selected orders"
              swapKey="selected"
              content={<span className="pt-status">{visibleSelected.length} selected</span>}
            >
              <div className="pt-dock-row">
                <LabIconButton variant="text" appearance="toolbar" aria-label="Clear selection" onClick={() => setSelected([])}>
                  <X />
                </LabIconButton>
                <LabButton variant="tonal">
                  <Truck />
                  Assign courier
                </LabButton>
                <LabButton variant="filled" onClick={confirmSelected}>
                  Confirm {visibleSelected.length}
                </LabButton>
              </div>
            </LabDock>
          ) : (
            <LabDock label="Order actions" swapKey="idle">
              <LabButton variant="filled">
                <Plus />
                New order
              </LabButton>
            </LabDock>
          )
        }
      >
        {rows.length ? (
          <div className="pt-list">
            <div className="pt-list-head">
              <LabCheckbox
                controlSize="compact"
                label={`${rows.length} orders`}
                checked={allSelected}
                indeterminate={visibleSelected.length > 0 && !allSelected}
                onCheckedChange={(on) => setSelected(on ? rows.map((order) => order.id) : [])}
              />
            </div>
            {rows.map((order) => (
              <div key={order.id} className="pt-row" data-selected={selected.includes(order.id) || undefined}>
                <LabCheckbox
                  label={`#${order.id} · ${order.customer}`}
                  description={`${order.wilaya} · ${order.courier}`}
                  checked={selected.includes(order.id)}
                  onCheckedChange={(on) => toggle(order.id, on)}
                />
                <span className="pt-row-end">
                  <strong>{order.total}</strong>
                  <span className="pt-tag" data-tone={order.confirmed ? 'success' : undefined}>
                    {order.confirmed ? 'Confirmed' : order.called ? 'Called' : 'New'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pt-state" role="status">
            <h4>No orders match</h4>
            <p>Nothing matches {q ? `“${query.trim()}” with ` : ''}these filters. Clear them to see every order again.</p>
            <LabButton variant="tonal" onClick={clearFilters}>
              Clear search and filters
            </LabButton>
          </div>
        )}
      </LabScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Orders list',
  description:
    'Filters and search float over the list; selecting rows swaps the dock from “New order” to actions on the selection. Search for a name that isn’t there to see the no-results state.',
}
