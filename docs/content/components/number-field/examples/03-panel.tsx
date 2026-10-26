import { useState } from 'react'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'

export default function ParcelPanel() {
  const [size, setSize] = useState({ length: 30, width: 20, height: 15, weight: 1.2 })
  const update = (key: keyof typeof size) => (value: number) => setSize((s) => ({ ...s, [key]: value }))
  return (
    <div className="demo-column" style={{ gap: 6 }}>
      <NumberField label="Length" unit="cm" controlSize="small" min={1} max={120} value={size.length} onValueChange={update('length')} />
      <NumberField label="Width" unit="cm" controlSize="small" min={1} max={120} value={size.width} onValueChange={update('width')} />
      <NumberField label="Height" unit="cm" controlSize="small" min={1} max={120} value={size.height} onValueChange={update('height')} />
      <NumberField label="Weight" unit="kg" controlSize="small" min={0} step={0.1} value={size.weight} onValueChange={update('weight')} />
    </div>
  )
}

export const meta = {
  title: 'Properties panel',
  description: 'Small fields stacked tightly, the way Blender lays out properties. Each one scrubs on its own.',
}
