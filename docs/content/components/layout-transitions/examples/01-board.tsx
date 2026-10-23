import { useState } from 'react'
import { ArrowRight, Shuffle } from 'lucide-react'
import { LayoutGroup } from '@feeef.dev/ui/physics'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../layout-demo.css'

const COLUMNS = ['New', 'Confirmed', 'Shipped'] as const
type Column = (typeof COLUMNS)[number]
const START: { id: number; customer: string; column: Column }[] = [
  { id: 1048, customer: 'Amina', column: 'New' },
  { id: 1047, customer: 'Yacine', column: 'New' },
  { id: 1046, customer: 'Sara', column: 'Confirmed' },
  { id: 1045, customer: 'Karim', column: 'New' },
  { id: 1044, customer: 'Lina', column: 'Confirmed' },
  { id: 1043, customer: 'Omar', column: 'Shipped' },
]

export default function OrderBoard() {
  const [orders, setOrders] = useState(START)
  const advance = (id: number) =>
    setOrders((list) =>
      list.map((o) => (o.id === id ? { ...o, column: COLUMNS[(COLUMNS.indexOf(o.column) + 1) % COLUMNS.length] } : o))
    )
  return (
    <div className="lt-demo">
      <div className="demo-row" style={{ justifyContent: 'flex-start' }}>
        <Button variant="tonal" controlSize="small" onClick={() => setOrders((l) => [...l].sort(() => Math.random() - 0.5))}>
          <Shuffle size={16} /> Shuffle
        </Button>
        <Button variant="text" controlSize="small" onClick={() => setOrders(START)}>
          Reset
        </Button>
      </div>
      <LayoutGroup>
        <div className="lt-board">
          {COLUMNS.map((column) => (
            <section key={column} className="lt-column" aria-label={column}>
              <h3>{column}</h3>
              {orders
                .filter((o) => o.column === column)
                .map((o) => (
                  // The id ties this card's old and new place together, across columns too.
                  <div key={o.id} className="lt-card" data-lab-layout-id={`order-${o.id}`}>
                    <span>
                      <strong>#{o.id}</strong> {o.customer}
                    </span>
                    <IconButton
                      variant="text"
                      controlSize="small"
                      aria-label={`Move #${o.id} to ${COLUMNS[(COLUMNS.indexOf(o.column) + 1) % 3]}`}
                      onClick={() => advance(o.id)}
                    >
                      <ArrowRight className="lab-dir-flip" />
                    </IconButton>
                  </div>
                ))}
            </section>
          ))}
        </div>
      </LayoutGroup>
    </div>
  )
}

export const meta = {
  title: 'Cards between columns',
  description:
    'Move a card and it flies to its new column; the cards around it close the gap. Click quickly: a card that is still moving turns toward its newest place at the speed it has.',
}
