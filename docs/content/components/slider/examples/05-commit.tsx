import { useState } from 'react'
import { Slider } from '@feeef.dev/ui/primitives/slider'

const dzd = (value: number) => `${value.toLocaleString('fr-DZ')} DZD`

export default function Commit() {
  const [price, setPrice] = useState(3000)
  const [applied, setApplied] = useState(3000)
  const [requests, setRequests] = useState(0)
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Maximum price</span>
        <output>{dzd(price)}</output>
      </div>
      <Slider
        label="Maximum price"
        min={500}
        max={20000}
        step={500}
        value={price}
        onValueChange={setPrice}
        onValueCommit={(value) => {
          setApplied(value)
          setRequests((count) => count + 1)
        }}
        getValueText={dzd}
      />
      <p role="status">
        Showing products up to {dzd(applied)} · {requests} filter requests
      </p>
    </div>
  )
}

export const meta = {
  title: 'Change and commit',
  description: 'onValueChange updates the label while dragging; onValueCommit runs the filter once, when the thumb is released.',
}
