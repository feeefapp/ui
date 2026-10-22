import { useState } from 'react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

const WILAYAS = ['Alger', 'Annaba', 'Blida', 'Constantine', 'Oran', 'Sétif', 'Tizi Ouzou', 'Tlemcen']

export default function Basic() {
  const [wilaya, setWilaya] = useState<string | null>(null)
  return (
    <div className="demo-column">
      <LabSelect hint="Wilaya" value={wilaya} onValueChange={setWilaya}>
        {WILAYAS.map((name) => (
          <LabOption key={name}>{name}</LabOption>
        ))}
      </LabSelect>
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'A controlled select. Each option uses its text as its value unless you pass one.',
}
