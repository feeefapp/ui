import { useState } from 'react'
import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'

export default function Basic() {
  const [notify, setNotify] = useState(true)
  return (
    <div className="demo-column">
      <LabCheckbox label="Send an SMS when the order ships" checked={notify} onCheckedChange={setNotify} />
      <LabCheckbox label="Allow customers to open the parcel before paying" />
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'Controlled with checked and onCheckedChange, or uncontrolled. The whole label toggles the box.',
}
