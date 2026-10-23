import { useState } from 'react'
import { GlassScope } from '@feeef.dev/ui/glass'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'

const STATUSES = [
  { value: 'new', label: 'New', count: 21 },
  { value: 'calling', label: 'Calling', count: 14 },
  { value: 'no-answer', label: 'No answer', count: 9 },
  { value: 'postponed', label: 'Postponed', count: 6 },
  { value: 'confirmed', label: 'Confirmed', count: 32 },
  { value: 'packed', label: 'Packed', count: 12 },
  { value: 'shipped', label: 'Shipped', count: 48 },
  { value: 'delivered', label: 'Delivered', count: 120 },
  { value: 'returned', label: 'Returned', count: 7 },
  { value: 'cancelled', label: 'Cancelled', count: 3 },
] as const
type Status = (typeof STATUSES)[number]['value']

export default function OrderStatusTabs() {
  const [status, setStatus] = useState<Status>('new')
  const current = STATUSES.find((s) => s.value === status)!
  return (
    <div className="demo-wide" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <GlassScope>
        <ToolbarGroup label="Order status">
          <SegmentedControl
            label="Order status"
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({ value: s.value, label: s.label, badge: String(s.count) }))}
          />
        </ToolbarGroup>
      </GlassScope>
      <p aria-live="polite" style={{ margin: 0, fontSize: 13 }}>
        {current.count} orders in “{current.label}”
      </p>
    </div>
  )
}

export const meta = {
  title: 'Order status tabs',
  description:
    'Ten statuses with counts in a glass bubble. They don’t fit, so the control scrolls inside itself: the edges fade, the selection scrolls into view, and dragging the pill to an edge scrolls on.',
}
