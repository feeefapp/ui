import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { DateField, DateRangeField } from '@feeef.dev/ui/primitives/temporal-field'

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
      <DateField hint="Shipped on" name="shipped" value={shipped} onValueChange={setShipped} />
      <DateRangeField
        hint="Orders placed"
        name="period"
        rangeNames={{ from: 'placed_from', to: 'placed_to' }}
        value={period}
        onValueChange={setPeriod}
      />
      <Button variant="tonal" type="submit">
        Export orders
      </Button>
      {submitted && <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{submitted}</pre>}
    </form>
  )
}

export const meta = {
  title: 'Native form values',
  description:
    'name submits the ISO value (ranges as JSON). rangeNames adds separate from and to entries.',
}
