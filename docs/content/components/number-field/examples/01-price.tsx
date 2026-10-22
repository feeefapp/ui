import { useState } from 'react'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'

export default function Price() {
  const [price, setPrice] = useState(2500)
  return (
    <div className="demo-column">
      <NumberField label="Price" unit="DA" step={50} min={0} value={price} onValueChange={setPrice} />
      <small>Drag sideways, or click and type 2500*0.9 to take 10% off.</small>
    </div>
  )
}

export const meta = {
  title: 'Price',
  description: 'No upper bound, so dragging moves one step (50 DA) every 8px. Typed values can be arithmetic.',
}
