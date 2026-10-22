import { useState } from 'react'
import { ArrowLeft, ArrowRight, Truck, X } from 'lucide-react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../dock-demo.css'

const ORDERS = ['#1048 Amina B.', '#1047 Yacine H.', '#1046 Sara M.', '#1045 Karim S.', '#1044 Lina C.', '#1043 Omar B.']

export default function SwapKey() {
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const toggle = (id: string) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const selecting = selected.length > 0

  return (
    <div className="dock-demo-frame">
      <ScrollArea
        label="Orders"
        bottom={
          // Key the task (browsing vs selecting), not the count: count changes keep focus and state.
          <Dock
            label={selecting ? 'Selection actions' : 'Page navigation'}
            swapKey={selecting ? 'selected' : 'browsing'}
            content={selecting ? <strong>{selected.length} selected</strong> : <span>Page {page}</span>}
          >
            {selecting ? (
              <div className="demo-row">
                <IconButton variant="text" aria-label="Clear selection" onClick={() => setSelected([])}>
                  <X />
                </IconButton>
                <Button variant="filled">
                  <Truck />
                  Ship {selected.length}
                </Button>
              </div>
            ) : (
              <div className="demo-row">
                <IconButton
                  variant="text"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ArrowLeft className="lab-dir-flip" />
                </IconButton>
                <IconButton variant="text" aria-label="Next page" onClick={() => setPage(page + 1)}>
                  <ArrowRight className="lab-dir-flip" />
                </IconButton>
              </div>
            )}
          </Dock>
        }
      >
        <div className="dock-demo-list" role="group" aria-label="Select orders">
          {ORDERS.map((order) => (
            <label key={order} className="dock-demo-row" aria-checked={selected.includes(order)}>
              <input type="checkbox" checked={selected.includes(order)} onChange={() => toggle(order)} />
              {order}
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Swapping content',
  description:
    'Select an order: swapKey changes from browsing to selected, the old actions fade out, the glass resizes and the new ones fade in.',
}
