import { useState } from 'react'
import { Archive, Check, Package, Trash2 } from 'lucide-react'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton } from '@feeef.dev/ui/primitives/button'

const START = [
  { id: 1048, customer: 'Amina Benali', city: 'Alger' },
  { id: 1047, customer: 'Yacine Haddad', city: 'Oran' },
  { id: 1046, customer: 'Sara Meziane', city: 'Constantine' },
  { id: 1045, customer: 'Karim Saidi', city: 'Blida' },
]

export default function SwipeInbox() {
  const [orders, setOrders] = useState(START)
  const [confirmed, setConfirmed] = useState<number[]>([])
  const [log, setLog] = useState('Swipe a row either way.')
  const remove = (id: number, what: string) => {
    setOrders((list) => list.filter((o) => o.id !== id))
    setLog(`#${id} ${what}.`)
  }
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 12 }}>
      <LabListSection header="To confirm" footer="Swipe right to confirm, left to archive or delete. A long swipe runs the first action.">
        {orders.map((o) => (
          <LabListRow
            key={o.id}
            leading={<Package />}
            title={`#${o.id} · ${o.customer}`}
            subtitle={o.city}
            trailing={confirmed.includes(o.id) ? 'Confirmed' : undefined}
            onClick={() => setLog(`Opened #${o.id}.`)}
            leadingActions={[
              {
                label: 'Confirm',
                tone: 'primary',
                icon: <Check />,
                onAction: () => {
                  setConfirmed((c) => [...c, o.id])
                  setLog(`#${o.id} confirmed.`)
                },
              },
            ]}
            trailingActions={[
              { label: 'Delete', tone: 'destructive', icon: <Trash2 />, onAction: () => remove(o.id, 'deleted') },
              { label: 'Archive', icon: <Archive />, onAction: () => remove(o.id, 'archived') },
            ]}
          />
        ))}
      </LabListSection>
      <div className="demo-row" style={{ justifyContent: 'space-between' }}>
        <span className="docs-muted" role="status">
          {log}
        </span>
        <LabButton
          variant="text"
          controlSize="compact"
          onClick={() => {
            setOrders(START)
            setConfirmed([])
          }}
        >
          Reset
        </LabButton>
      </div>
    </div>
  )
}

export const meta = {
  title: 'Swipe actions',
  description:
    'Drag a row with a finger, pen or mouse. Release past half the buttons to keep them open, flick far to run the first action. With the keyboard, focus a row and press the arrow keys; Escape closes.',
}
