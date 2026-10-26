import { useState } from 'react'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'

export default function Basic() {
  const [delivery, setDelivery] = useState<'home' | 'desk'>('home')
  return (
    <div className="demo-column" style={{ justifyItems: 'center' }}>
      <SegmentedControl
        label="Delivery type"
        className="demo-segmented-box"
        value={delivery}
        onChange={setDelivery}
        options={[
          { value: 'home', label: 'Home delivery' },
          { value: 'desk', label: 'Stop desk' },
        ]}
      />
      <p>{delivery === 'home' ? 'Courier fee: 600 DZD' : 'Courier fee: 400 DZD'}</p>
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description:
    'Two to five short options, here on a plain box (a surface-token background). value and onChange share one typed union.',
}
