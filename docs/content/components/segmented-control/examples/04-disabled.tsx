import { useState } from 'react'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'

export default function Disabled() {
  const [payment, setPayment] = useState<'cod' | 'card' | 'baridimob'>('cod')
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <LabSegmentedControl
        label="Payment method"
        value={payment}
        onChange={setPayment}
        options={[
          { value: 'cod', label: 'Cash on delivery' },
          { value: 'card', label: 'CIB / Edahabia', disabled: true },
          { value: 'baridimob', label: 'BaridiMob' },
        ]}
      />
      <LabSegmentedControl
        label="Store status"
        value="open"
        onChange={() => {}}
        disabled
        options={[
          { value: 'open', label: 'Open' },
          { value: 'paused', label: 'Paused' },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Disabled options',
  description:
    'A disabled option is skipped by arrow keys. disabled on the control turns off every option.',
}
