import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabNumberField } from '@feeef.dev/ui/primitives/number-field'

export default function InAForm() {
  const [sent, setSent] = useState<string | null>(null)
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        setSent(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
      }}
    >
      <LabNumberField label="Quantity" name="quantity" min={1} max={20} defaultValue={1} />
      <LabNumberField label="Delivery fee" name="fee" unit="DA" step={50} min={0} defaultValue={400} />
      <LabButton variant="filled" type="submit">
        Add to order
      </LabButton>
      {sent && <code>{sent}</code>}
    </form>
  )
}

export const meta = {
  title: 'In a form',
  description: 'name submits the value through a hidden input. Backspace on a focused field returns it to defaultValue.',
}
