import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'
import {
  readTemporalForm,
  validateTemporal,
  type TemporalValue,
} from '@feeef.dev/ui/filters/temporal'

export default function InAForm() {
  const [draft, setDraft] = useState<TemporalValue>(null)
  const [status, setStatus] = useState('Choose the hours couriers can pick up parcels.')
  return (
    <form
      className="demo-wide"
      style={{ display: 'grid', gap: 16 }}
      onSubmit={(event) => {
        event.preventDefault()
        const value = readTemporalForm('timeRange', new FormData(event.currentTarget))
        const error = validateTemporal({ type: 'timeRange' }, value)
        setStatus(error ?? `Saved pickup hours: ${JSON.stringify(value)}`)
      }}
    >
      <TemporalFilterEditor config={{ type: 'timeRange' }} value={draft} onChange={setDraft} />
      <Button variant="filled" type="submit">
        Save pickup hours
      </Button>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Inside a form',
  description:
    'The editor writes hidden from/to (or date) inputs; readTemporalForm turns the FormData back into a value.',
}
