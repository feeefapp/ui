import { useState } from 'react'
import { AutoHeight } from '@feeef.dev/ui/motion'
import { Button } from '@feeef.dev/ui/primitives/button'

const LINES = [
  ['Subtotal', '4,800 DZD'],
  ['Delivery to Oran', '600 DZD'],
  ['Discount', '−300 DZD'],
]

export default function AutoHeightExample() {
  const [open, setOpen] = useState(false)
  return (
    <div className="demo-column">
      <AutoHeight
        style={{ border: '1px solid var(--lab-line)', borderRadius: 'var(--lab-radius-panel)' }}
      >
        <div style={{ display: 'grid', gap: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Total</strong>
            <strong>5,100 DZD</strong>
          </div>
          {open &&
            LINES.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--lab-muted)' }}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
        </div>
      </AutoHeight>
      <Button variant="text" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide breakdown' : 'Show breakdown'}
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Height that follows content',
  description:
    'AutoHeight eases its height when the content inside grows or shrinks, so the button below glides instead of jumping.',
}
