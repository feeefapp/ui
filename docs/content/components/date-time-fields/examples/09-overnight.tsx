import { useState } from 'react'
import { LabTimeRangeField } from '@feeef.dev/ui/primitives/temporal-field'

export default function Overnight() {
  const [shift, setShift] = useState<{ from: string; to: string } | null>({
    from: '20:00',
    to: '02:00',
  })
  return (
    <div className="demo-column">
      <LabTimeRangeField
        hint="Night confirmation shift"
        value={shift}
        onValueChange={setShift}
        allowOvernight
        supportingText="Ends the next morning."
      />
    </div>
  )
}

export const meta = {
  title: 'Overnight time ranges',
  description: 'allowOvernight lets a time range end before it starts, crossing midnight.',
}
