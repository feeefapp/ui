import { useState } from 'react'
import {
  LabDateField,
  LabDateTimeField,
  LabTimeField,
} from '@feeef.dev/ui/primitives/temporal-field'

export default function SingleValues() {
  const [delivery, setDelivery] = useState<string | null>(null)
  const [pickup, setPickup] = useState<string | null>('10:30')
  const [callback, setCallback] = useState<string | null>(null)
  return (
    <div className="demo-column">
      <LabDateField
        hint="Delivery date"
        value={delivery}
        onValueChange={setDelivery}
        clearable
      />
      <LabTimeField hint="Courier pickup" value={pickup} onValueChange={setPickup} />
      <LabDateTimeField
        hint="Call the customer back"
        value={callback}
        onValueChange={setCallback}
        supportingText="The confirmation agent gets a reminder at this time."
      />
    </div>
  )
}

export const meta = {
  title: 'Date, time and datetime',
  description:
    'Single values open in a popover. The value is a local ISO string: 2026-10-21, 10:30 or 2026-10-21T10:30.',
}
