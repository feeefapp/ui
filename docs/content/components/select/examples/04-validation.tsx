import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

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
      <Select
        hint="Delivery method"
        name="method"
        required
        requiredMessage="Choose how the order is delivered."
        leadingIcon={<Truck size={18} />}
        value={method}
        onValueChange={setMethod}
      >
        <Option value="home">Home delivery</Option>
        <Option value="desk">Stop desk</Option>
      </Select>
      <Select
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
        <Option>Alger</Option>
        <Option>Oran</Option>
        <Option>Tamanrasset</Option>
      </Select>
      <Button variant="filled" type="submit">
        Ship order
      </Button>
      <p role="status">{status}</p>
    </form>
  )
}

export const meta = {
  title: 'Required and validated',
  description:
    'required blocks submit and focuses the select; a validator rejects values that are listed but not allowed in this context.',
}
