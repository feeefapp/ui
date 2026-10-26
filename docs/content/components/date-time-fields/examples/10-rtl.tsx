import { useState } from 'react'
import { DateRangeField } from '@feeef.dev/ui/primitives/temporal-field'

export default function RightToLeft() {
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null)
  return (
    <div className="demo-column" dir="rtl">
      <DateRangeField
        hint="فترة الطلبات"
        locale="ar-DZ"
        value={period}
        onValueChange={setPeriod}
        clearable
      />
    </div>
  )
}

export const meta = {
  title: 'Right to left',
  description:
    'The field mirrors under dir="rtl". locale sets the language of the displayed value and the calendar (it defaults to the provider locale); the stored value stays ISO.',
}
