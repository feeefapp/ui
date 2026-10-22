import { useState } from 'react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

const VARIANTS = ['elevated', 'outlined', 'filled', 'tonal', 'text'] as const

export default function Variants() {
  const [currency, setCurrency] = useState('DZD')
  return (
    <div className="demo-column">
      {VARIANTS.map((variant) => (
        <LabSelect
          key={variant}
          variant={variant}
          labelStyle={variant === 'filled' || variant === 'tonal' ? 'inside' : 'outlined'}
          hint={`Currency (${variant})`}
          value={currency}
          onValueChange={setCurrency}
        >
          <LabOption value="DZD">Algerian dinar (DZD)</LabOption>
          <LabOption value="EUR">Euro (EUR)</LabOption>
          <LabOption value="USD">US dollar (USD)</LabOption>
        </LabSelect>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'Selects default to elevated. Match the variant of the text fields around them.',
}
