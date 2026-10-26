import { useState } from 'react'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'

export default function Percent() {
  const [discount, setDiscount] = useState(15)
  return (
    <div className="demo-column">
      <NumberField label="Discount" unit="%" min={0} max={100} value={discount} onValueChange={setDiscount} />
    </div>
  )
}

export const meta = {
  title: 'Bounded, with fill',
  description:
    'With min and max the field fills like Blender’s sliders, and its full width covers the full range.',
}
