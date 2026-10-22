import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabRadioGroup } from '@feeef.dev/ui/primitives/choice'

export default function Required() {
  const [plan, setPlan] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  return (
    <form
      className="demo-column"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!plan) return setError('Choose a plan to continue.')
        setStatus(`Switched to the ${plan} plan.`)
      }}
    >
      <LabRadioGroup
        label="Plan"
        name="plan"
        required
        value={plan ?? ''}
        onValueChange={(next) => {
          setPlan(next)
          setError(null)
        }}
        error={error}
        options={[
          { value: 'starter', label: 'Starter', description: 'Up to 300 orders a month.' },
          { value: 'pro', label: 'Pro', description: 'Unlimited orders, inventory and finance.' },
        ]}
      />
      <LabButton variant="filled" type="submit">
        Continue
      </LabButton>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Required with an error',
  description: 'No default, so the group is required. error explains what to do and clears on the next choice.',
}
