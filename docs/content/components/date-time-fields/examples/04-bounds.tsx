import { useState } from 'react'
import { DateField, TimeField } from '@feeef.dev/ui/primitives/temporal-field'

const iso = (date: Date) => date.toLocaleDateString('en-CA')

export default function Bounds() {
  const today = new Date()
  const lastDay = new Date(today)
  lastDay.setDate(today.getDate() + 14)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>('10:00')
  return (
    <div className="demo-column">
      <DateField
        hint="Delivery date"
        value={date}
        onValueChange={setDate}
        min={iso(today)}
        max={iso(lastDay)}
        supportingText="Within the next two weeks."
      />
      <TimeField
        hint="Delivery slot"
        value={slot}
        onValueChange={setSlot}
        min="08:00"
        max="18:00"
        step={30 * 60}
        supportingText="Half-hour slots between 08:00 and 18:00."
      />
    </div>
  )
}

export const meta = {
  title: 'Bounds and steps',
  description:
    'min and max disable the days outside them. step is in days for dates and seconds for times, counted from min.',
}
