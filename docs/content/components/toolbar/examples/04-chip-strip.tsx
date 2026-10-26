import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

const filters = ['All orders', 'New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Returned', 'Cancelled', 'Drafts']

export default function ChipStrip() {
  const [active, setActive] = useState('All orders')
  return (
    <div className="toolbar-demo-surface">
      <Toolbar
        label="Orders"
        leading={
          // A plain scroller: its glass is cut at its edges and moves with its scroll.
          <div className="toolbar-demo-strip">
            {filters.map((filter) => (
              <ToolbarGroup key={filter} label={filter}>
                <Button
                  variant="text"
                  appearance="toolbar"
                  aria-pressed={filter === active}
                  onClick={() => setActive(filter)}
                >
                  {filter}
                </Button>
              </ToolbarGroup>
            ))}
          </div>
        }
        trailing={
          <ToolbarGroup label="Filter actions">
            <IconButton variant="text" appearance="toolbar" aria-label="More filters">
              <SlidersHorizontal />
            </IconButton>
          </ToolbarGroup>
        }
      />
    </div>
  )
}

export const meta = {
  title: 'Scrolling chip strip',
  description:
    'Put many groups in a horizontal scroller inside the toolbar. Their glass is clipped to the scroller like its content, cut straight at the edge, with no container of its own.',
}
