import { useState } from 'react'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

export default function CompactAndDisabled() {
  const [size, setSize] = useState('M')
  return (
    <div className="demo-column">
      <Select controlSize="compact" labelStyle="inside" hint="Size" value={size} onValueChange={setSize}>
        <Option>S</Option>
        <Option>M</Option>
        <Option>L</Option>
        <Option>XL</Option>
      </Select>
      <Select
        hint="Store currency"
        value="DZD"
        onValueChange={() => {}}
        disabled
        supportingText="Set when the store was created."
      >
        <Option value="DZD">Algerian dinar (DZD)</Option>
      </Select>
    </div>
  )
}

export const meta = {
  title: 'Compact and disabled',
  description: 'Compact fits dense rows. A disabled select keeps its label and value readable.',
}
