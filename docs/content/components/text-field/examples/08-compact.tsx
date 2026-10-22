import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Compact() {
  return (
    <div className="demo-row">
      <div style={{ width: 160 }}>
        <TextField controlSize="compact" hint="SKU" defaultValue="TSH-BLK-M" />
      </div>
      <div style={{ width: 120 }}>
        <TextField controlSize="compact" hint="Quantity" type="number" min={1} defaultValue="2" />
      </div>
      <div style={{ width: 160 }}>
        <TextField controlSize="compact" hint="Unit price" inputMode="numeric" defaultValue="2500" trailing="DZD" />
      </div>
    </div>
  )
}

export const meta = {
  title: 'Compact',
  description: 'controlSize="compact" for dense rows such as order lines. Touch screens keep a 44px target.',
}
