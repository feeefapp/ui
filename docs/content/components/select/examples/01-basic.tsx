import { useState } from 'react'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

const WILAYAS = ['Alger', 'Annaba', 'Blida', 'Constantine', 'Oran', 'Sétif', 'Tizi Ouzou', 'Tlemcen']

export default function Basic() {
  const [wilaya, setWilaya] = useState<string | null>(null)
  return (
    <div className="demo-column">
      <Select hint="Wilaya" value={wilaya} onValueChange={setWilaya}>
        {WILAYAS.map((name) => (
          <Option key={name}>{name}</Option>
        ))}
      </Select>
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'A controlled select. Each option uses its text as its value unless you pass one.',
}
