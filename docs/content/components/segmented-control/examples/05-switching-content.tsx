import { useState } from 'react'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'

const STATS = {
  today: { orders: 38, confirmed: 29, revenue: '113 100' },
  week: { orders: 241, confirmed: 187, revenue: '729 300' },
  month: { orders: 1032, confirmed: 801, revenue: '3 123 900' },
}

export default function SwitchingContent() {
  const [range, setRange] = useState<keyof typeof STATS>('today')
  const stats = STATS[range]
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <LabSegmentedControl
        label="Summary period"
        value={range}
        onChange={setRange}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
      />
      <dl
        aria-live="polite"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: 0, width: '100%' }}
      >
        {[
          ['Orders', stats.orders],
          ['Confirmed', stats.confirmed],
          ['Revenue (DZD)', stats.revenue],
        ].map(([term, value]) => (
          <div key={term}>
            <dt style={{ fontSize: 13, opacity: 0.7 }}>{term}</dt>
            <dd style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export const meta = {
  title: 'Changing what is shown',
  description: 'The choice applies at once and updates the content right next to it.',
}
