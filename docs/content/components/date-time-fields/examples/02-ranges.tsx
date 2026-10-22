import { useState } from 'react'
import {
  LabDateRangeField,
  LabDateTimeRangeField,
  LabTimeRangeField,
} from '@feeef.dev/ui/primitives/temporal-field'

type Range = { from: string; to: string } | null

export default function Ranges() {
  const [period, setPeriod] = useState<Range>(null)
  const [hours, setHours] = useState<Range>({ from: '09:00', to: '17:00' })
  const [promo, setPromo] = useState<Range>(null)
  return (
    <div className="demo-column">
      <LabDateRangeField
        hint="Reporting period"
        value={period}
        onValueChange={setPeriod}
        clearable
      />
      <LabTimeRangeField hint="Delivery hours" value={hours} onValueChange={setHours} />
      <LabDateTimeRangeField
        hint="Flash sale window"
        value={promo}
        onValueChange={setPromo}
        supportingText="Leave the end open to run the sale until you stop it."
      />
    </div>
  )
}

export const meta = {
  title: 'Ranges',
  description:
    'Ranges open in a dialog. Click a start day, then an end day; either end can stay open. The value is { from, to }.',
}
