import { useState } from 'react'
import { Slider } from '@feeef.dev/ui/primitives/slider'

export default function Basic() {
  const [discount, setDiscount] = useState(15)
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Discount</span>
        <output>{discount}%</output>
      </div>
      <Slider
        label="Discount"
        max={50}
        step={5}
        value={discount}
        onValueChange={setDiscount}
        getValueText={(value) => `${value}%`}
      />
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'A controlled slider with a visible label and value. getValueText gives screen readers the same “15%”.',
}
