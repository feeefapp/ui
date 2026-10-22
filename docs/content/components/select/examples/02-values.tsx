import { useState } from 'react'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

export default function Values() {
  const [courier, setCourier] = useState('yalidine')
  const [filter, setFilter] = useState('')
  return (
    <div className="demo-column">
      <Select hint="Courier" value={courier} onValueChange={setCourier}>
        <Option value="yalidine">Yalidine</Option>
        <Option value="zrexpress">ZR Express</Option>
        <Option value="maystro">Maystro Delivery</Option>
        <Option value="ecotrack">Ecotrack</Option>
      </Select>
      <Select hint="Show orders from" value={filter} onValueChange={setFilter}>
        <Option value="">Any courier</Option>
        <Option value="yalidine">Yalidine</Option>
        <Option value="zrexpress">ZR Express</Option>
      </Select>
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
