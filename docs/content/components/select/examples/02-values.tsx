import { useState } from 'react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

export default function Values() {
  const [courier, setCourier] = useState('yalidine')
  const [filter, setFilter] = useState('')
  return (
    <div className="demo-column">
      <LabSelect hint="Courier" value={courier} onValueChange={setCourier}>
        <LabOption value="yalidine">Yalidine</LabOption>
        <LabOption value="zrexpress">ZR Express</LabOption>
        <LabOption value="maystro">Maystro Delivery</LabOption>
        <LabOption value="ecotrack">Ecotrack</LabOption>
      </LabSelect>
      <LabSelect hint="Show orders from" value={filter} onValueChange={setFilter}>
        <LabOption value="">Any courier</LabOption>
        <LabOption value="yalidine">Yalidine</LabOption>
        <LabOption value="zrexpress">ZR Express</LabOption>
      </LabSelect>
      <p>
        Saved courier: <code>{courier}</code>, filter: <code>{filter || '(none)'}</code>
      </p>
    </div>
  )
}

export const meta = {
  title: 'Option values',
  description: 'Give options a stable value separate from their label. An option with value="" means “no selection”.',
}
