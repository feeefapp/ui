import { CalendarX } from 'lucide-react'
import { DateField, TimeField } from '@feeef.dev/ui/primitives/temporal-field'

export default function States() {
  return (
    <div className="demo-column">
      <DateField
        hint="Order date"
        value="2026-10-14"
        onValueChange={() => {}}
        readOnly
        supportingText="Set when the customer placed the order."
      />
      <TimeField hint="Pickup time" value="09:00" onValueChange={() => {}} disabled />
      <DateField
        hint="Delivery date"
        value="2026-10-23"
        onValueChange={() => {}}
        leadingIcon={<CalendarX />}
        error="Yalidine has no capacity in Oran on this day."
      />
    </div>
  )
}

export const meta = {
  title: 'Read-only, disabled and server errors',
  description:
    'readOnly shows the value without opening a picker. error shows feedback from your API and wins over built-in messages.',
}
