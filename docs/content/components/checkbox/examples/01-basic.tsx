import { useState } from 'react'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'

export default function Basic() {
  const [notify, setNotify] = useState(true)
  return (
    <div className="demo-column">
      <Checkbox label="Send an SMS when the order ships" checked={notify} onCheckedChange={setNotify} />
      <Checkbox label="Allow customers to open the parcel before paying" />
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'Controlled with checked and onCheckedChange, or uncontrolled. The whole label toggles the box.',
}
