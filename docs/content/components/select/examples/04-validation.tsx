import { useState } from 'react'
import { Truck } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

export default function Validation() {
  const [method, setMethod] = useState<string | null>(null)
  const [wilaya, setWilaya] = useState<string | null>('Tamanrasset')
  const [status, setStatus] = useState('')
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        setStatus(`Shipping ${method} to ${wilaya}.`)
      }}
    >
      <LabSelect
        hint="Delivery method"
        name="method"
        required
        requiredMessage="Choose how the order is delivered."
        leadingIcon={<Truck size={18} />}
        value={method}
        onValueChange={setMethod}
      >
        <LabOption value="home">Home delivery</LabOption>
        <LabOption value="desk">Stop desk</LabOption>
      </LabSelect>
      <LabSelect
        hint="Wilaya"
        name="wilaya"
        value={wilaya}
        onValueChange={setWilaya}
        validator={(value) =>
          method === 'home' && value === 'Tamanrasset' ? 'Home delivery is not available here yet.' : null
        }
        validationMode="change"
        supportingText="Try home delivery to Tamanrasset."
      >
        <LabOption>Alger</LabOption>
        <LabOption>Oran</LabOption>
        <LabOption>Tamanrasset</LabOption>
      </LabSelect>
      <LabButton variant="filled" type="submit">
        Ship order
      </LabButton>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Required and validated',
  description:
    'required blocks submit and focuses the select; a validator rejects values that are listed but not allowed in this context.',
}
