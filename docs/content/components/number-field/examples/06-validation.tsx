import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'

export default function Validation() {
  const [price, setPrice] = useState(0)
  const [saved, setSaved] = useState<number | null>(null)
  return (
    <form
      className="demo-column"
      onSubmit={(event) => {
        event.preventDefault()
        setSaved(price)
      }}
    >
      <NumberField
        label="Price"
        name="price"
        unit="DA"
        step={50}
        min={0}
        value={price}
        onValueChange={setPrice}
        supportingText="What the customer pays on delivery."
        validator={(value) => (value <= 0 ? 'Enter a price above 0 DA.' : null)}
      />
      <NumberField label="Stock" name="stock" min={0} defaultValue={12} error="Stock changed while you edited. Reload it." />
      <Button variant="filled" type="submit">
        Save product
      </Button>
      {saved != null && <p>Saved at {saved} DA.</p>}
    </form>
  )
}

export const meta = {
  title: 'Validation and help',
  description:
    'validator, error and supportingText work like a TextField’s: errors show under the field and block the form.',
}
