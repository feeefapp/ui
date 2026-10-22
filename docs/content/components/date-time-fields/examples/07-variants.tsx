import { useState } from 'react'
import { LabDateField } from '@feeef.dev/ui/primitives/temporal-field'

const VARIANTS = ['outlined', 'filled', 'tonal', 'elevated', 'text'] as const

export default function Variants() {
  const [values, setValues] = useState<Record<string, string | null>>({})
  return (
    <div className="demo-column">
      {VARIANTS.map((variant) => (
        <LabDateField
          key={variant}
          hint={`${variant[0].toUpperCase()}${variant.slice(1)}`}
          variant={variant}
          controlSize="compact"
          value={values[variant] ?? null}
          onValueChange={(next) => setValues((old) => ({ ...old, [variant]: next }))}
        />
      ))}
      <LabDateField
        hint="Inside label"
        labelStyle="inside"
        value={values.inside ?? null}
        onValueChange={(next) => setValues((old) => ({ ...old, inside: next }))}
      />
    </div>
  )
}

export const meta = {
  title: 'Variants, sizes and labels',
  description:
    'Fields share variant, controlSize and labelStyle with text fields, so a date sits naturally in any form.',
}
