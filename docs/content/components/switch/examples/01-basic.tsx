import { useState } from 'react'
import { LabSlideSwitch } from '@feeef.dev/ui/primitives/slider'

const SETTINGS = [
  { id: 'cod', label: 'Cash on delivery', description: 'Customers pay the courier when the parcel arrives.' },
  { id: 'stopdesk', label: 'Stop desk pickup', description: 'Offer pickup at the courier’s office at a lower price.' },
  { id: 'reviews', label: 'Product reviews', description: 'Ask delivered customers to rate what they bought.' },
]

export default function Basic() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ cod: true, stopdesk: true, reviews: false })
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 16 }}>
      {SETTINGS.map((setting) => (
        <div key={setting.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }} aria-hidden="true">
            <strong style={{ display: 'block' }}>{setting.label}</strong>
            <small>{setting.description}</small>
          </div>
          <LabSlideSwitch
            label={setting.label}
            checked={enabled[setting.id]}
            onCheckedChange={(checked) => setEnabled((state) => ({ ...state, [setting.id]: checked }))}
          />
        </div>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Settings list',
  description: 'Each row names the setting and the switch applies it right away. The visible text repeats the switch’s label.',
}
