import { useState } from 'react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

export default function CompactAndDisabled() {
  const [size, setSize] = useState('M')
  return (
    <div className="demo-column">
      <LabSelect controlSize="compact" labelStyle="inside" hint="Size" value={size} onValueChange={setSize}>
        <LabOption>S</LabOption>
        <LabOption>M</LabOption>
        <LabOption>L</LabOption>
        <LabOption>XL</LabOption>
      </LabSelect>
      <LabSelect
        hint="Store currency"
        value="DZD"
        onValueChange={() => {}}
        disabled
        supportingText="Set when the store was created."
      >
        <LabOption value="DZD">Algerian dinar (DZD)</LabOption>
      </LabSelect>
    </div>
  )
}

export const meta = {
  title: 'Compact and disabled',
  description: 'Compact fits dense rows. A disabled select keeps its label and value readable.',
}
