import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'

export default function Required() {
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState('')
  return (
    <form
      className="demo-column"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        setStatus(accepted ? 'Store published.' : '')
      }}
    >
      <LabCheckbox
        name="terms"
        required
        label="I accept the seller terms"
        description="Including the cash-on-delivery return policy."
        checked={accepted}
        onCheckedChange={setAccepted}
        error={submitted && !accepted ? 'Accept the seller terms to publish your store.' : null}
      />
      <LabButton variant="filled" type="submit">
        Publish store
      </LabButton>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Required with an error',
  description: 'error shows a message under the label and marks the checkbox invalid until it is cleared.',
}
