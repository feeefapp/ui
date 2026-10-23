import { useState } from 'react'
import { Download } from 'lucide-react'
import { FilterBar, type FilterOption, type FilterValue } from '@feeef.dev/ui/filter-bar'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../filter-demo.css'

const OPTIONS: FilterOption[] = [
  {
    id: 'minTotal',
    label: 'Minimum total',
    type: 'custom',
    description: 'Orders worth at least this amount',
    formatValue: (value) => `≥ ${value} DA`,
    validate: (value) =>
      value != null && !(Number(value) >= 0) ? 'Enter an amount of 0 DA or more.' : null,
    renderEditor: (value, onChange) => (
      <TextField
        hint="Amount in DA"
        inputMode="numeric"
        value={typeof value === 'string' ? value : ''}
        onValueChange={(next) => onChange(next || null)}
      />
    ),
  },
]

const ORDERS = [
  { id: '#1048', total: 4500 },
  { id: '#1047', total: 2900 },
  { id: '#1046', total: 7200 },
  { id: '#1045', total: 1800 },
]

export default function CustomEditor() {
  const [values, setValues] = useState<Record<string, FilterValue>>({})
  const [pinned, setPinned] = useState<string[]>(['minTotal'])
  const min = typeof values.minTotal === 'string' ? Number(values.minTotal) : 0
  const filtered = values.minTotal != null
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
            // A back button while a value is set, and view actions at the end.
            onBack={filtered ? () => setValues({}) : undefined}
            trailing={
              <ToolbarGroup label="Order list actions">
                <IconButton variant="text" appearance="toolbar" aria-label="Export CSV">
                  <Download />
                </IconButton>
              </ToolbarGroup>
            }
          />
        }
      >
        <div className="filter-demo-list">
          {ORDERS.filter((order) => order.total >= min).map((order) => (
            <div key={order.id} className="filter-demo-row">
              <strong>Order {order.id}</strong>
              <span>{order.total.toLocaleString('fr-DZ')} DA</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Custom editor, back and trailing',
  description:
    'A custom option renders its own editor in a dialog, with formatValue for the chip and validate for Apply. onBack and trailing complete the bar.',
}
