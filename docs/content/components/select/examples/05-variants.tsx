import { useState } from 'react'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

const VARIANTS = ['elevated', 'outlined', 'filled', 'tonal', 'text'] as const

export default function Variants() {
  const [currency, setCurrency] = useState('DZD')
  return (
    <div className="demo-column">
      {VARIANTS.map((variant) => (
        <Select
          key={variant}
          variant={variant}
          labelStyle={variant === 'filled' || variant === 'tonal' ? 'inside' : 'outlined'}
          hint={`Currency (${variant})`}
          value={currency}
          onValueChange={setCurrency}
        >
          <Option value="DZD">Algerian dinar (DZD)</Option>
          <Option value="EUR">Euro (EUR)</Option>
          <Option value="USD">US dollar (USD)</Option>
        </Select>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'Selects default to elevated. Match the variant of the text fields around them.',
}
