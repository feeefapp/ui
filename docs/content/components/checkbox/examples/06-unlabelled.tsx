import { useState } from 'react'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'

export default function Unlabelled() {
  const [selected, setSelected] = useState(true)
  return (
    <div className="demo-row">
      <Checkbox aria-label="Select order #10234" checked={selected} onCheckedChange={setSelected} />
      <Checkbox aria-label="Select order #10235" />
      <Checkbox aria-label="Select order #10236" controlSize="small" />
    </div>
  )
}

export const meta = {
  title: 'Without a visible label',
  description: 'Only the box, for list rows and table cells; aria-label names it and touch still reaches 44px.',
}
