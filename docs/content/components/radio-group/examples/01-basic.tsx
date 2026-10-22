import { useState } from 'react'
import { LabRadioGroup } from '@feeef.dev/ui/primitives/choice'

export default function Basic() {
  const [payment, setPayment] = useState('cod')
  return (
    <div className="demo-column">
      <LabRadioGroup
        label="Payment method"
        value={payment}
        onValueChange={setPayment}
        options={[
          { value: 'cod', label: 'Cash on delivery' },
          { value: 'edahabia', label: 'Edahabia card' },
          { value: 'cib', label: 'CIB card' },
        ]}
      />
      <p>
        Selected: <code>{payment}</code>
      </p>
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'A controlled group. The label is the fieldset legend that names the question.',
}
