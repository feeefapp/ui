import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { ScrollArea, revealScrollChild } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import '../scroll-demo.css'

const ORDERS = Array.from({ length: 16 }, (_, i) => ({
  id: `#${1060 - i}`,
  city: ['Alger', 'Oran', 'Constantine', 'Blida'][i % 4],
}))

export default function Reveal() {
  const viewport = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const [selected, setSelected] = useState(0)

  const select = (index: number) => {
    const next = Math.max(0, Math.min(ORDERS.length - 1, index))
    setSelected(next)
    // Scrolls only this viewport, and keeps the row out from under the dock.
    revealScrollChild(viewport.current, rows.current[next], { behavior: 'smooth' })
  }

  return (
    <div className="scroll-demo-frame">
      <ScrollArea
        ref={viewport}
        label="Orders to confirm"
        bottom={
          <Dock label="Order navigation" content={<strong>Order {ORDERS[selected].id}</strong>}>
            <Button variant="tonal" disabled={selected === 0} onClick={() => select(selected - 1)}>
              <ArrowUp />
              Previous
            </Button>
            <Button
              variant="filled"
              disabled={selected === ORDERS.length - 1}
              onClick={() => select(selected + 1)}
            >
              <ArrowDown />
              Next
            </Button>
          </Dock>
        }
      >
        <div className="scroll-demo-list" role="listbox" aria-label="Orders">
          {ORDERS.map((order, index) => (
            <div
              key={order.id}
              ref={(node) => {
                rows.current[index] = node
              }}
              role="option"
              aria-selected={index === selected}
              className="scroll-demo-row"
              onClick={() => select(index)}
            >
              <span>
                <strong>Order {order.id}</strong>
                <small>{order.city} · waiting for confirmation</small>
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Revealing a row',
  description:
    'revealScrollChild scrolls the least distance needed to show a row, inside this viewport only, respecting the space reserved for the dock.',
}
