import { useState } from 'react'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

export default function Placeholder() {
  const [sort, setSort] = useState<string | null>(null)
  return (
    <div className="demo-row">
      <Select
        aria-label="Sort orders"
        placeholder="Sort by"
        controlSize="small"
        value={sort}
        onValueChange={setSort}
      >
        <Option value="newest">Newest first</Option>
        <Option value="oldest">Oldest first</Option>
        <Option value="total">Highest total</Option>
      </Select>
    </div>
  )
}

export const meta = {
  title: 'Placeholder in a toolbar',
  description: 'Without a hint, placeholder fills the empty trigger. Name the select with aria-label.',
}
