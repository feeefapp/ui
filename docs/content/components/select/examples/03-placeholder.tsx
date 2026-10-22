import { useState } from 'react'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

export default function Placeholder() {
  const [sort, setSort] = useState<string | null>(null)
  return (
    <div className="demo-row">
      <LabSelect
        aria-label="Sort orders"
        placeholder="Sort by"
        controlSize="compact"
        value={sort}
        onValueChange={setSort}
      >
        <LabOption value="newest">Newest first</LabOption>
        <LabOption value="oldest">Oldest first</LabOption>
        <LabOption value="total">Highest total</LabOption>
      </LabSelect>
    </div>
  )
}

export const meta = {
  title: 'Placeholder in a toolbar',
  description: 'Without a hint, placeholder fills the empty trigger. Name the select with aria-label.',
}
