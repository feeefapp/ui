import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { DateField } from '@feeef.dev/ui/primitives/temporal-field'

const isFriday = (value: string) => new Date(`${value}T12:00`).getDay() === 5

export default function Validation() {
  const [date, setDate] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        setStatus(`Delivery scheduled for ${date}.`)
      }}
    >
      <DateField
        hint="Delivery date"
        name="deliveryDate"
        value={date}
        onValueChange={setDate}
        required
        requiredMessage="Choose a delivery date."
        validator={(value) =>
          typeof value === 'string' && isFriday(value)
            ? 'Couriers don’t deliver on Friday. Choose another day.'
            : null
        }
      />
      <Button variant="filled" type="submit">
        Schedule delivery
      </Button>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Required and custom rules',
  description:
    'Submit empty or pick a Friday. The picker refuses to apply an invalid draft, and the form focuses the field.',
}
