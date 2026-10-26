import { useState } from 'react'
import { Radio } from '@feeef.dev/ui/primitives/choice'

const COURIERS = [
  { id: 'yalidine', name: 'Yalidine', price: '600 DZD', days: '2–3 days' },
  { id: 'zrexpress', name: 'ZR Express', price: '550 DZD', days: '3–4 days' },
  { id: 'maystro', name: 'Maystro Delivery', price: '650 DZD', days: '1–2 days' },
]

export default function SingleRadio() {
  const [courier, setCourier] = useState('yalidine')
  return (
    <fieldset className="demo-wide" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ marginBottom: 12, fontWeight: 600 }}>Courier for this order</legend>
      <div style={{ display: 'grid', gap: 8 }}>
        {COURIERS.map((option) => (
          <div
            key={option.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 14px',
              border: '1px solid var(--lab-line)',
              borderRadius: 14,
            }}
          >
            <Radio
              name="courier"
              value={option.id}
              label={option.name}
              description={option.days}
              checked={courier === option.id}
              onCheckedChange={(checked) => checked && setCourier(option.id)}
            />
            <strong>{option.price}</strong>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export const meta = {
  title: 'Single radios in a custom layout',
  description: 'Radio for rows the group cannot draw. You provide the shared name, checked state and fieldset.',
}
