import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabDateField, LabDateRangeField } from '@feeef.dev/ui/primitives/temporal-field'

export default function FormValues() {
  const [shipped, setShipped] = useState<string | null>('2026-10-19')
  const [period, setPeriod] = useState<{ from: string; to: string } | null>({
    from: '2026-10-01',
    to: '2026-10-31',
  })
  const [submitted, setSubmitted] = useState('')
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setSubmitted([...data].map(([key, value]) => `${key}=${value}`).join('\n'))
      }}
    >
      <LabDateField hint="Shipped on" name="shipped" value={shipped} onValueChange={setShipped} />
      <LabDateRangeField
        hint="Orders placed"
        name="period"
        rangeNames={{ from: 'placed_from', to: 'placed_to' }}
        value={period}
        onValueChange={setPeriod}
      />
      <LabButton variant="tonal" type="submit">
        Export orders
      </LabButton>
      {submitted && <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{submitted}</pre>}
    </form>
  )
}

export const meta = {
  title: 'Native form values',
  description:
    'name submits the ISO value (ranges as JSON). rangeNames adds separate from and to entries.',
}
