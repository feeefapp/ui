import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

const phoneError = (value: string) =>
  /^0[567]\d{8}$/.test(value.replace(/\s/g, '')) ? null : 'Use 10 digits starting with 05, 06 or 07.'

export default function Validation() {
  const [status, setStatus] = useState('')
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        setStatus('Order saved.')
      }}
      onReset={() => setStatus('')}
    >
      <TextField hint="Customer name" name="name" required minLength={3} />
      <TextField
        hint="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        required
        validator={phoneError}
        supportingText="Checked when you leave the field."
      />
      <TextField
        hint="Email (optional)"
        name="email"
        type="email"
        validationMode="change"
        supportingText="Checked as you type."
      />
      <div className="demo-row">
        <Button variant="text" type="reset">
          Reset
        </Button>
        <Button variant="filled" type="submit">
          Save order
        </Button>
      </div>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Validation',
  description:
    'Native constraints and a validator block submit. Errors appear after the first blur by default, or on every change with validationMode="change". Reset clears them.',
}
